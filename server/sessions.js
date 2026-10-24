/**
 * Service Session Planning and Client Treatment Course Engine
 * Maison Beyou CRM
 */

export function calculateNextDueDate(baseDateStr, intervalValue, intervalUnit = 'days') {
  if (!baseDateStr || !intervalValue || intervalValue <= 0) return null;

  try {
    const parts = baseDateStr.split('-');
    if (parts.length !== 3) return null;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);

    const date = new Date(year, month, day);
    if (isNaN(date.getTime())) return null;

    const unitLower = (intervalUnit || 'days').toLowerCase();
    const daysToAdd = unitLower.startsWith('week') ? (intervalValue * 7) : intervalValue;

    date.setDate(date.getDate() + daysToAdd);

    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  } catch (e) {
    console.error('calculateNextDueDate error:', e);
    return null;
  }
}

export function formatSessionMessage(sessionNumber, totalPlannedSessions, intervalValue, intervalUnit, status, nextDueDate) {
  if (status === 'completed' || sessionNumber > totalPlannedSessions) {
    return 'All planned clinical sessions have been successfully completed.';
  }

  if (sessionNumber === 1) {
    return 'Today is your first session.';
  }

  if (sessionNumber === totalPlannedSessions) {
    return 'Your final planned session.';
  }

  const unit = (intervalUnit || 'days').toLowerCase();
  const unitLabel = unit.startsWith('week')
    ? (intervalValue === 1 ? 'week' : 'weeks')
    : (intervalValue === 1 ? 'day' : 'days');

  if (nextDueDate) {
    return `Your next session is due in ${intervalValue} ${unitLabel} (Due: ${nextDueDate}).`;
  }

  return `Your next session is due in ${intervalValue} ${unitLabel}.`;
}

export function getActiveCourse(db, clientId, serviceId) {
  const course = db.prepare(`
    SELECT * FROM CLIENT_TREATMENT_COURSES
    WHERE client_id = ? AND service_id = ? AND status = 'active'
    ORDER BY course_id DESC
    LIMIT 1
  `).get(clientId, serviceId);

  if (!course) return null;

  // If completed count has already reached planned total, auto-finalize and return null
  if (course.completed_sessions_count >= course.total_planned_sessions) {
    db.prepare(`
      UPDATE CLIENT_TREATMENT_COURSES
      SET status = 'completed', next_due_date = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE course_id = ?
    `).run(course.course_id);
    return null;
  }

  return course;
}

export function createTreatmentCourse(db, clientId, serviceId, customOptions = {}) {
  const service = db.prepare('SELECT * FROM SERVICES WHERE service_id = ?').get(serviceId);
  const serviceName = customOptions.service_name || service?.service_name || 'Treatment Course';

  const totalPlanned = customOptions.total_planned_sessions !== undefined
    ? parseInt(customOptions.total_planned_sessions, 10)
    : (service?.total_sessions || 1);

  const intervalVal = customOptions.interval_value !== undefined
    ? parseInt(customOptions.interval_value, 10)
    : (service?.session_interval || 0);

  const intervalUnit = customOptions.interval_unit || service?.session_interval_unit || 'days';
  const startDate = customOptions.start_date || new Date().toISOString().split('T')[0];

  const info = db.prepare(`
    INSERT INTO CLIENT_TREATMENT_COURSES (
      client_id, service_id, service_name_snapshot, total_planned_sessions,
      interval_value, interval_unit, completed_sessions_count, status,
      start_date, notes
    ) VALUES (?, ?, ?, ?, ?, ?, 0, 'active', ?, ?)
  `).run(
    clientId,
    serviceId,
    serviceName,
    Math.max(1, totalPlanned),
    Math.max(0, intervalVal),
    intervalUnit,
    startDate,
    customOptions.notes || ''
  );

  return db.prepare('SELECT * FROM CLIENT_TREATMENT_COURSES WHERE course_id = ?').get(info.lastInsertRowid);
}

export function processVisitServiceSession(db, {
  visitId,
  visitServiceId,
  clientId,
  serviceId,
  visitDate,
  staffId,
  status = 'completed',
  notes = ''
}) {
  if (!clientId || !serviceId) return null;

  // 1. Idempotency Check: Did this visit_service already record a session?
  if (visitServiceId) {
    const existing = db.prepare(`
      SELECT * FROM TREATMENT_COURSE_SESSIONS WHERE visit_service_id = ?
    `).get(visitServiceId);

    if (existing) {
      // If status changed (e.g. from upcoming to completed or cancelled), update it
      if (existing.status !== status) {
        return updateSessionStatus(db, existing.session_id, status);
      }
      const course = db.prepare('SELECT * FROM CLIENT_TREATMENT_COURSES WHERE course_id = ?').get(existing.course_id);
      return {
        session: existing,
        course,
        alreadyRecorded: true
      };
    }
  }

  // 2. Check if the service has session tracking enabled
  const service = db.prepare('SELECT * FROM SERVICES WHERE service_id = ?').get(serviceId);
  const serviceHasTracking = service && service.has_sessions === 1;

  // Check if there is an existing active course for this client & service
  let course = getActiveCourse(db, clientId, serviceId);

  // If service has tracking enabled but no active course exists, start one!
  if (!course && serviceHasTracking) {
    course = createTreatmentCourse(db, clientId, serviceId, {
      start_date: visitDate,
      service_name: service.service_name,
      total_planned_sessions: service.total_sessions || 1,
      interval_value: service.session_interval || 0,
      interval_unit: service.session_interval_unit || 'days'
    });
  }

  // If no course exists (e.g. service does not have session tracking enabled), nothing to track
  if (!course) return null;

  // 3. Determine next session sequence number
  const completedCountResult = db.prepare(`
    SELECT COUNT(*) as count FROM TREATMENT_COURSE_SESSIONS
    WHERE course_id = ? AND status = 'completed'
  `).get(course.course_id);

  const completedCount = completedCountResult?.count || 0;
  const sessionNumber = completedCount + 1;

  // 4. Insert treatment session record
  const sessionInfo = db.prepare(`
    INSERT INTO TREATMENT_COURSE_SESSIONS (
      course_id, client_id, service_id, session_number, total_sessions,
      visit_id, visit_service_id, session_date, status, staff_id, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    course.course_id,
    clientId,
    serviceId,
    sessionNumber,
    course.total_planned_sessions,
    visitId || null,
    visitServiceId || null,
    visitDate,
    status,
    staffId || null,
    notes || ''
  );

  const sessionId = sessionInfo.lastInsertRowid;

  // 5. Update visit service link
  if (visitServiceId) {
    db.prepare(`
      UPDATE VISIT_SERVICES
      SET course_id = ?, session_number = ?, total_sessions = ?, session_status = ?
      WHERE visit_service_id = ?
    `).run(course.course_id, sessionNumber, course.total_planned_sessions, status, visitServiceId);
  }

  // 6. Update course progress if session is completed
  let updatedCourse = course;
  if (status === 'completed') {
    const newCompletedCount = completedCount + 1;
    const isNowComplete = newCompletedCount >= course.total_planned_sessions;
    const nextDueDate = isNowComplete
      ? null
      : calculateNextDueDate(visitDate, course.interval_value, course.interval_unit);

    db.prepare(`
      UPDATE CLIENT_TREATMENT_COURSES
      SET completed_sessions_count = ?,
          last_completed_date = ?,
          next_due_date = ?,
          status = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE course_id = ?
    `).run(
      newCompletedCount,
      visitDate,
      nextDueDate,
      isNowComplete ? 'completed' : 'active',
      course.course_id
    );

    updatedCourse = db.prepare('SELECT * FROM CLIENT_TREATMENT_COURSES WHERE course_id = ?').get(course.course_id);
  }

  const recordedSession = db.prepare('SELECT * FROM TREATMENT_COURSE_SESSIONS WHERE session_id = ?').get(sessionId);

  return {
    session: recordedSession,
    course: updatedCourse,
    alreadyRecorded: false
  };
}

export function updateSessionStatus(db, sessionId, newStatus) {
  const session = db.prepare('SELECT * FROM TREATMENT_COURSE_SESSIONS WHERE session_id = ?').get(sessionId);
  if (!session) throw new Error('Treatment session not found');

  db.prepare(`
    UPDATE TREATMENT_COURSE_SESSIONS
    SET status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE session_id = ?
  `).run(newStatus, sessionId);

  if (session.visit_service_id) {
    db.prepare(`
      UPDATE VISIT_SERVICES
      SET session_status = ?
      WHERE visit_service_id = ?
    `).run(newStatus, session.visit_service_id);
  }

  // Recalculate course completed count and next due date based strictly on completed sessions
  const course = db.prepare('SELECT * FROM CLIENT_TREATMENT_COURSES WHERE course_id = ?').get(session.course_id);
  if (course) {
    const completedSessions = db.prepare(`
      SELECT * FROM TREATMENT_COURSE_SESSIONS
      WHERE course_id = ? AND status = 'completed'
      ORDER BY session_number ASC
    `).all(course.course_id);

    const completedCount = completedSessions.length;
    const lastSession = completedSessions[completedSessions.length - 1];
    const lastCompletedDate = lastSession ? lastSession.session_date : null;

    const isComplete = completedCount >= course.total_planned_sessions;
    const nextDueDate = (!isComplete && lastCompletedDate)
      ? calculateNextDueDate(lastCompletedDate, course.interval_value, course.interval_unit)
      : null;

    db.prepare(`
      UPDATE CLIENT_TREATMENT_COURSES
      SET completed_sessions_count = ?,
          last_completed_date = ?,
          next_due_date = ?,
          status = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE course_id = ?
    `).run(
      completedCount,
      lastCompletedDate,
      nextDueDate,
      isComplete ? 'completed' : 'active',
      course.course_id
    );
  }

  const updatedSession = db.prepare('SELECT * FROM TREATMENT_COURSE_SESSIONS WHERE session_id = ?').get(sessionId);
  const updatedCourse = course ? db.prepare('SELECT * FROM CLIENT_TREATMENT_COURSES WHERE course_id = ?').get(course.course_id) : null;

  return {
    session: updatedSession,
    course: updatedCourse
  };
}

export function extendCourse(db, courseId, additionalSessions, newIntervalValue, newIntervalUnit) {
  const course = db.prepare('SELECT * FROM CLIENT_TREATMENT_COURSES WHERE course_id = ?').get(courseId);
  if (!course) throw new Error('Treatment course not found');

  const addSessions = parseInt(additionalSessions, 10);
  if (isNaN(addSessions) || addSessions <= 0) {
    throw new Error('Please enter a positive number of sessions to extend');
  }

  const newTotal = course.total_planned_sessions + addSessions;
  const intervalVal = newIntervalValue !== undefined && !isNaN(parseInt(newIntervalValue, 10))
    ? parseInt(newIntervalValue, 10)
    : course.interval_value;

  const intervalUnit = newIntervalUnit || course.interval_unit || 'days';

  const isComplete = course.completed_sessions_count >= newTotal;
  const nextDueDate = (!isComplete && course.last_completed_date)
    ? calculateNextDueDate(course.last_completed_date, intervalVal, intervalUnit)
    : null;

  db.prepare(`
    UPDATE CLIENT_TREATMENT_COURSES
    SET total_planned_sessions = ?,
        interval_value = ?,
        interval_unit = ?,
        next_due_date = ?,
        status = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE course_id = ?
  `).run(
    newTotal,
    intervalVal,
    intervalUnit,
    nextDueDate,
    isComplete ? 'completed' : 'active',
    courseId
  );

  return db.prepare('SELECT * FROM CLIENT_TREATMENT_COURSES WHERE course_id = ?').get(courseId);
}

export function getClientTreatmentCourses(db, clientId) {
  const courses = db.prepare(`
    SELECT c.*, s.service_name as current_service_name, s.price as current_service_price
    FROM CLIENT_TREATMENT_COURSES c
    LEFT JOIN SERVICES s ON c.service_id = s.service_id
    WHERE c.client_id = ?
    ORDER BY c.status = 'active' DESC, c.course_id DESC
  `).all(clientId);

  return courses.map(course => {
    const sessions = db.prepare(`
      SELECT tcs.*, s.name as staff_name, v.visit_date, v.payment_status
      FROM TREATMENT_COURSE_SESSIONS tcs
      LEFT JOIN STAFF s ON tcs.staff_id = s.staff_id
      LEFT JOIN VISITS v ON tcs.visit_id = v.visit_id
      WHERE tcs.course_id = ?
      ORDER BY tcs.session_number ASC
    `).all(course.course_id);

    const completedCount = course.completed_sessions_count || 0;
    const totalPlanned = course.total_planned_sessions || 1;
    const progressPercent = Math.min(100, Math.round((completedCount / totalPlanned) * 100));
    const remainingSessions = Math.max(0, totalPlanned - completedCount);

    const isComplete = course.status === 'completed' || completedCount >= totalPlanned;
    const currentSessionNum = isComplete ? totalPlanned : (completedCount + 1);

    const statusMessage = formatSessionMessage(
      currentSessionNum,
      totalPlanned,
      course.interval_value,
      course.interval_unit,
      course.status,
      course.next_due_date
    );

    return {
      ...course,
      completed_sessions: completedCount,
      total_planned: totalPlanned,
      remaining_sessions: remainingSessions,
      progress_percent: progressPercent,
      is_completed: isComplete,
      status_message: statusMessage,
      sessions
    };
  });
}
