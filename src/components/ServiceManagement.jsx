import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit2, Check, X, ShieldAlert, Sparkles, 
  Trash2, ToggleLeft, ToggleRight, DollarSign, Layers 
} from 'lucide-react';
import { apiRequest, formatCurrency } from '../utils/api';

export default function ServiceManagement() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals & form state
  const [categoryModal, setCategoryModal] = useState({ open: false, mode: 'create', data: null });
  const [serviceModal, setServiceModal] = useState({ open: false, mode: 'create', categoryId: null, data: null });

  // Form inputs
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catOrder, setCatOrder] = useState(0);

  const [servName, setServName] = useState('');
  const [servPrice, setServPrice] = useState('');
  const [servDuration, setServDuration] = useState(45);
  const [servDesc, setServDesc] = useState('');
  const [servOrder, setServOrder] = useState(0);

  const fetchAdminCategories = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/admin/categories');
      setCategories(res.categories || []);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminCategories();
  }, []);

  // Category Actions
  const handleOpenCatModal = (cat = null) => {
    if (cat) {
      setCategoryModal({ open: true, mode: 'edit', data: cat });
      setCatName(cat.category_name);
      setCatDesc(cat.description || '');
      setCatOrder(cat.display_order || 0);
    } else {
      setCategoryModal({ open: true, mode: 'create', data: null });
      setCatName('');
      setCatDesc('');
      setCatOrder(categories.length + 1);
    }
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    try {
      if (categoryModal.mode === 'create') {
        await apiRequest('/admin/categories', {
          method: 'POST',
          body: JSON.stringify({ category_name: catName, description: catDesc, display_order: parseInt(catOrder) })
        });
      } else {
        await apiRequest(`/admin/categories/${categoryModal.data.category_id}`, {
          method: 'PUT',
          body: JSON.stringify({ category_name: catName, description: catDesc, display_order: parseInt(catOrder) })
        });
      }
      setCategoryModal({ open: false, mode: 'create', data: null });
      fetchAdminCategories();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleCatActive = async (cat) => {
    try {
      await apiRequest(`/admin/categories/${cat.category_id}`, {
        method: 'PUT',
        body: JSON.stringify({ active: cat.active === 1 ? 0 : 1 })
      });
      fetchAdminCategories();
    } catch (err) {
      alert(err.message);
    }
  };

  // Service Actions
  const handleOpenServModal = (categoryId, serv = null) => {
    if (serv) {
      setServiceModal({ open: true, mode: 'edit', categoryId, data: serv });
      setServName(serv.service_name);
      setServPrice(serv.price);
      setServDuration(serv.duration_mins || 45);
      setServDesc(serv.description || '');
      setServOrder(serv.display_order || 0);
    } else {
      setServiceModal({ open: true, mode: 'create', categoryId, data: null });
      setServName('');
      setServPrice('');
      setServDuration(45);
      setServDesc('');
      setServOrder(0);
    }
  };

  const handleSaveService = async (e) => {
    e.preventDefault();
    try {
      if (serviceModal.mode === 'create') {
        await apiRequest('/admin/services', {
          method: 'POST',
          body: JSON.stringify({
            category_id: serviceModal.categoryId,
            service_name: servName,
            price: parseFloat(servPrice),
            duration_mins: parseInt(servDuration),
            description: servDesc,
            display_order: parseInt(servOrder)
          })
        });
      } else {
        await apiRequest(`/admin/services/${serviceModal.data.service_id}`, {
          method: 'PUT',
          body: JSON.stringify({
            service_name: servName,
            price: parseFloat(servPrice),
            duration_mins: parseInt(servDuration),
            description: servDesc,
            display_order: parseInt(servOrder)
          })
        });
      }
      setServiceModal({ open: false, mode: 'create', categoryId: null, data: null });
      fetchAdminCategories();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleServActive = async (serv) => {
    try {
      await apiRequest(`/admin/services/${serv.service_id}`, {
        method: 'PUT',
        body: JSON.stringify({ active: serv.active === 1 ? 0 : 1 })
      });
      fetchAdminCategories();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.14em', color: '#B88B4A', fontWeight: '700' }}>
            Studio Master Settings
          </div>
          <h1 style={{ fontSize: '28px', color: '#1C1917' }}>
            SERVICE & PRICING MANAGEMENT
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Configure the 6 main service categories, sub-services, and studio pricing.
          </p>
        </div>

        <button
          onClick={() => handleOpenCatModal()}
          className="btn-primary"
          style={{ padding: '10px 20px', fontSize: '14px' }}
        >
          <Plus size={16} />
          + Add New Category
        </button>
      </div>

      {/* Safety Reassurance Notice (Rule 2 & 3 Compliance) */}
      <div style={{
        background: 'var(--bg-card-subtle)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '13px',
        color: 'var(--text-muted)'
      }}>
        <Sparkles size={18} color="#B88B4A" />
        <span>
          <strong>Data Integrity Safeguard:</strong> Changing current prices or disabling services will <em>never</em> alter or delete past invoices or historical client records. All historical receipts retain their snapshot prices.
        </span>
      </div>

      {/* Categories & Sub-Services Accordion / Cards */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading service catalog...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {categories.map((cat, idx) => (
            <div key={cat.category_id} className="card" style={{ overflow: 'hidden' }}>
              
              {/* Category Header Bar */}
              <div style={{
                padding: '18px 24px',
                background: cat.active === 1 ? 'var(--bg-surface)' : '#F3F4F6',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '14px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: cat.active === 1 ? 'var(--primary-subtle)' : '#E5E7EB',
                    color: cat.active === 1 ? '#B88B4A' : '#9CA3AF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                    fontSize: '14px'
                  }}>
                    {cat.display_order || idx + 1}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <h2 style={{ fontSize: '18px', color: '#1C1917' }}>
                        {cat.category_name}
                      </h2>
                      <span className={`badge ${cat.active === 1 ? 'badge-paid' : 'badge-neutral'}`} style={{ fontSize: '11px' }}>
                        {cat.active === 1 ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {cat.description || 'No description provided'}
                    </div>
                  </div>
                </div>

                {/* Category Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => handleToggleCatActive(cat)}
                    style={{
                      fontSize: '12px',
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: '#FFFFFF',
                      border: '1px solid var(--border-color)',
                      fontWeight: '600',
                      color: cat.active === 1 ? '#DC2626' : '#166534'
                    }}
                  >
                    {cat.active === 1 ? 'Disable Category' : 'Enable Category'}
                  </button>

                  <button
                    onClick={() => handleOpenCatModal(cat)}
                    style={{
                      fontSize: '12px',
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: '#FFFFFF',
                      border: '1px solid var(--border-color)',
                      fontWeight: '600',
                      color: 'var(--text-main)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Edit2 size={13} />
                    Edit
                  </button>

                  <button
                    onClick={() => handleOpenServModal(cat.category_id)}
                    className="btn-primary"
                    style={{ padding: '6px 14px', fontSize: '12px' }}
                  >
                    <Plus size={14} />
                    + Add Sub-Service
                  </button>
                </div>
              </div>

              {/* Sub-services table */}
              <div className="horizontal-scroller" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: '680px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ background: '#FFFFFF', borderBottom: '1px solid var(--border-light)', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>
                      <th style={{ padding: '12px 24px', fontWeight: '600' }}>Sub-Service Name</th>
                      <th style={{ padding: '12px 16px', fontWeight: '600' }}>Price (INR)</th>
                      <th style={{ padding: '12px 16px', fontWeight: '600' }}>Duration</th>
                      <th style={{ padding: '12px 16px', fontWeight: '600' }}>Status</th>
                      <th style={{ padding: '12px 24px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(cat.services || []).length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No sub-services yet in this category. Click "+ Add Sub-Service" above.
                        </td>
                      </tr>
                    ) : (
                      cat.services.map(s => (
                        <tr key={s.service_id} style={{ borderBottom: '1px solid var(--border-light)', opacity: s.active === 1 ? 1 : 0.6 }}>
                          <td style={{ padding: '14px 24px' }}>
                            <div style={{ fontWeight: '600', color: '#1C1917' }}>{s.service_name}</div>
                            {s.description && (
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{s.description}</div>
                            )}
                          </td>
                          <td style={{ padding: '14px 16px', fontWeight: '700', color: '#B88B4A', fontSize: '15px' }}>
                            {formatCurrency(s.price)}
                          </td>
                          <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>
                            {s.duration_mins || 45} mins
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <span className={`badge ${s.active === 1 ? 'badge-paid' : 'badge-neutral'}`} style={{ fontSize: '11px' }}>
                              {s.active === 1 ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td style={{ padding: '14px 24px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '8px', whiteSpace: 'nowrap' }}>
                              <button
                                onClick={() => handleToggleServActive(s)}
                                style={{
                                  fontSize: '11px',
                                  padding: '4px 8px',
                                  borderRadius: 'var(--radius-sm)',
                                  background: 'var(--bg-surface)',
                                  border: '1px solid var(--border-color)',
                                  color: s.active === 1 ? '#DC2626' : '#166534',
                                  fontWeight: '600'
                                }}
                              >
                                {s.active === 1 ? 'Disable' : 'Enable'}
                              </button>

                              <button
                                onClick={() => handleOpenServModal(cat.category_id, s)}
                                style={{
                                  fontSize: '11px',
                                  padding: '4px 10px',
                                  borderRadius: 'var(--radius-sm)',
                                  background: '#FFFFFF',
                                  border: '1px solid var(--border-color)',
                                  color: 'var(--text-main)',
                                  fontWeight: '600',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <Edit2 size={12} />
                                Edit Price / Details
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Category Modal */}
      {categoryModal.open && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(28,25,23,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="card animate-fade-in" style={{ maxWidth: '480px', width: '100%', padding: '28px' }}>
            <h2 style={{ fontSize: '20px', color: '#1C1917', marginBottom: '4px' }}>
              {categoryModal.mode === 'create' ? 'Add Service Category' : 'Edit Service Category'}
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Categories are displayed as large cards during visit reception.
            </p>

            <form onSubmit={handleSaveCategory} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g. Laser Hair Reduction"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                  Description / Sub-header
                </label>
                <input
                  type="text"
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  placeholder="e.g. Precision diode & alexandrite laser therapies"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                  Display Order
                </label>
                <input
                  type="number"
                  value={catOrder}
                  onChange={(e) => setCatOrder(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setCategoryModal({ open: false, mode: 'create', data: null })}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sub-Service Modal */}
      {serviceModal.open && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(28,25,23,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="card animate-fade-in" style={{ maxWidth: '480px', width: '100%', padding: '28px' }}>
            <h2 style={{ fontSize: '20px', color: '#1C1917', marginBottom: '4px' }}>
              {serviceModal.mode === 'create' ? 'Add Sub-Service' : 'Edit Sub-Service & Price'}
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Enter service details and standard studio pricing in INR.
            </p>

            <form onSubmit={handleSaveService} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                  Service Name *
                </label>
                <input
                  type="text"
                  required
                  value={servName}
                  onChange={(e) => setServName(e.target.value)}
                  placeholder="e.g. Underarms Laser"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1"
                    value={servPrice}
                    onChange={(e) => setServPrice(e.target.value)}
                    placeholder="1500"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min="5"
                    step="5"
                    value={servDuration}
                    onChange={(e) => setServDuration(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                  Description / Protocol Notes
                </label>
                <input
                  type="text"
                  value={servDesc}
                  onChange={(e) => setServDesc(e.target.value)}
                  placeholder="e.g. Targeted cooling diode therapy"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setServiceModal({ open: false, mode: 'create', categoryId: null, data: null })}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Sub-Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
