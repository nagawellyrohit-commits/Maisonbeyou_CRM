import Database from 'better-sqlite3';
import React from 'react';
import ReactDOMServer from 'react-dom/server';

const db = new Database('server/maison_beyou.db');
const visit88 = db.prepare(`
  SELECT v.*, c.name as client_name, c.phone as client_phone, c.first_visit_date,
         c.membership_tier as client_membership_tier,
         c.membership_balance, c.membership_cost, c.membership_expires_at,
         c.membership_benefit_status,
         COALESCE(c.last_membership_benefit_used, c.last_benefit_used) as last_membership_benefit_used,
         c.last_membership_amount_used,
         COALESCE(v.membership_tier, c.membership_tier) as effective_membership_tier
  FROM VISITS v
  JOIN CLIENTS c ON v.client_id = c.client_id
  WHERE v.visit_id = 88
`).get();

console.log('Testing visit 88 data:', visit88);

// Test also visit 60
const visit60 = db.prepare(`
  SELECT v.*, c.name as client_name, c.phone as client_phone, c.first_visit_date,
         c.membership_tier as client_membership_tier,
         c.membership_balance, c.membership_cost, c.membership_expires_at,
         c.membership_benefit_status,
         COALESCE(c.last_membership_benefit_used, c.last_benefit_used) as last_membership_benefit_used,
         c.last_membership_amount_used,
         COALESCE(v.membership_tier, c.membership_tier) as effective_membership_tier
  FROM VISITS v
  JOIN CLIENTS c ON v.client_id = c.client_id
  WHERE v.visit_id = 60
`).get();

console.log('Testing visit 60 data:', visit60);
