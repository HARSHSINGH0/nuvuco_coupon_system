'use client';

import { useState } from 'react';

export default function Home() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBulk, setIsBulk] = useState(false);
  const [appreciatedBy, setAppreciatedBy] = useState('');
  const [dept, setDept] = useState('');
  const [globalContractor, setGlobalContractor] = useState('');
  const [isContractorGlobal, setIsContractorGlobal] = useState(false);
  // duplicate removed
  const [bulkEntries, setBulkEntries] = useState([
    { id: Date.now(), name: '', contractor: '', pno: '', appreciated_for: '', award_type: '' },
  ]);

  // ---------- Single entry handlers ----------
  const handleSingleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (response.ok) {
        alert(result.message || 'Reward Coupon Submitted Successfully!');
        form.reset();
      } else {
        alert(result.error || result.message || 'Failed to submit coupon.');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert(error.message || 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------- Bulk entry handlers ----------
  const addRow = () => {
    if (bulkEntries.length >= 10) return;
    setBulkEntries((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), name: '', contractor: '', pno: '', appreciated_for: '', award_type: '' },
    ]);
  };

  const removeRow = (id) => {
    setBulkEntries((prev) => prev.filter((row) => row.id !== id));
  };

  const updateRow = (id, field, value) => {
    setBulkEntries((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const handleBulkSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    const payload = {
      appreciated_by: appreciatedBy,
      dept: dept,
      isContractorGlobal,
      globalContractor,
      entries: bulkEntries.map((row) => {
        const { id, ...rest } = row;
        return {
          ...rest,
          contractor: isContractorGlobal ? globalContractor : rest.contractor,
        };
      }),
    };
    try {
      const response = await fetch('/api/bulk-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (response.ok) {
        const messages = result.results
          .map((r) => {
            const msg = r.message || r.reason || r.status || '';
            return `${r.name}: ${msg}`;
          })
          .join('\n');
        alert(messages);
        // reset bulk form
        setAppreciatedBy('');
        setDept('');
        setBulkEntries([
          { id: Date.now(), name: '', contractor: '', pno: '', appreciated_for: '', award_type: '' },
        ]);
        setIsContractorGlobal(false);
        setGlobalContractor('');
      } else {
        alert(result.error || 'Bulk submission failed.');
      }
    } catch (error) {
      console.error('Bulk submit error:', error);
      alert(error.message || 'An error occurred during bulk submit.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main>
      {isBulk ? (
        <form key="bulk-form" className="coupon-container" onSubmit={handleBulkSubmit}>
          <div className="header">
            <div className="logo-box">
              <img src="https://upload.wikimedia.org/wikipedia/commons/2/20/Nuvoco_Vistas_Corp_Ltd.png" alt="Nuvoco Logo" />
            </div>
            <div className="header-center">
              <div className="plant-title">Sonadih Cement Plant</div>
              <h2 className="congrats-text">Congratulations</h2>
            </div>
            <div className="logo-right">
              <img src="/safety_logo.png" alt="Safety Logo" />
            </div>
          </div>
          <div className="banner">
            <div className="banner-text">Reward &amp; Recognition • Shabhash Card • Rs. 100 On-Spot Gift</div>
          </div>

          <div className="toggle-wrapper">
            <button type="button" onClick={() => setIsBulk(false)} className={`toggle-btn ${!isBulk ? 'active' : ''}`}>Single Submit</button>
            <button type="button" onClick={() => setIsBulk(true)} className={`toggle-btn ${isBulk ? 'active' : ''}`}>Bulk Submit (HOD)</button>
          </div>

          <div className="form-grid" style={{ marginTop: '15px' }}>
            <div className="input-group col-6">
              <label htmlFor="appreciated_by">Appreciated By (HOD)</label>
              <input
                type="text"
                id="appreciated_by"
                name="appreciated_by"
                placeholder="Manager or Supervisor Name"
                required
                value={appreciatedBy}
                onChange={(e) => setAppreciatedBy(e.target.value)}
              />
            </div>
            <div className="input-group col-6">
              <label htmlFor="dept">Department</label>
              <select
                id="dept"
                name="dept"
                required
                value={dept}
                onChange={(e) => setDept(e.target.value)}
              >
                <option value="" disabled>Select Dept</option>
                <option value="Sales">Sales</option>
                <option value="Production">Production</option>
                <option value="E&amp;I">E&amp;I</option>
                <option value="HR">HR</option>
                <option value="Safety">Safety</option>
                <option value="Mechanical">Mechanical</option>
                <option value="Mines">Mines</option>
                <option value="Packing">Packing</option>
                <option value="Logistics">Logistics</option>
                <option value="Quality">Quality</option>
                <option value="Accounts">Accounts</option>
                <option value="CPP/WHR">CPP/WHR</option>
                <option value="Environment">Environment</option>
              </select>
            </div>
            {/* Global Contractor Toggle */}
            <div className="input-group col-6 inline-toggle">
              <input
                type="checkbox"
                id="globalContractorToggle"
                checked={isContractorGlobal}
                onChange={(e) => setIsContractorGlobal(e.target.checked)}
                className="global-contract-toggle"
              />
              <label htmlFor="globalContractorToggle" className="global-contract-label">
                Contractor same for all?
              </label>
            </div>
            {isContractorGlobal && (
              <div className="input-group col-6">
                <label htmlFor="globalContractor">Contractor (Global)</label>
                <input
                  type="text"
                  id="globalContractor"
                  placeholder="Enter contractor"
                  value={globalContractor}
                  onChange={(e) => setGlobalContractor(e.target.value)}
                />
              </div>
            )}
          </div>

          {bulkEntries.map((row, idx) => (
            <div key={row.id} className="bulk-row" style={{ border: '1px solid #444', padding: '1rem', marginBottom: '1rem' }}>
              <h4 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>Employee #{idx + 1}<button type="button" onClick={() => removeRow(row.id)} className="action-btn delete-btn" style={{ margin: 0 }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>Delete Row</button></h4>
              <div className="form-grid">
                <div className="input-group col-4">
                  <label htmlFor={`name-${row.id}`}>Employee Name</label>
                  <input
                    type="text"
                    id={`name-${row.id}`}
                    value={row.name}
                    onChange={(e) => updateRow(row.id, 'name', e.target.value)}
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div className="input-group col-4">
                  <label htmlFor={`pno-${row.id}`}>P No. (Phone)</label>
                  <input
                    type="text"
                    id={`pno-${row.id}`}
                    value={row.pno}
                    onChange={(e) => updateRow(row.id, 'pno', e.target.value)}
                    placeholder="e.g. 9876543210"
                    required
                  />
                </div>
                {!isContractorGlobal && (
                  <div className="input-group col-4">
                    <label htmlFor={`contractor-${row.id}`}>Contractor</label>
                    <input
                      type="text"
                      id={`contractor-${row.id}`}
                      value={row.contractor}
                      onChange={(e) => updateRow(row.id, 'contractor', e.target.value)}
                      placeholder="If applicable"
                    />
                  </div>
                )}
                <div className="input-group col-8">
                  <label htmlFor={`appreciated_for-${row.id}`}>Appreciated For</label>
                  <input
                    type="text"
                    id={`appreciated_for-${row.id}`}
                    value={row.appreciated_for}
                    onChange={(e) => updateRow(row.id, 'appreciated_for', e.target.value)}
                    placeholder="Describe the excellent work..."
                    required
                  />
                </div>
                <div className="input-group col-12">
                  <div className="checkbox-container">
                    <label className="custom-radio">
                      <input
                        type="radio"
                        name={`award_type-${row.id}`}
                        value="safety"
                        checked={row.award_type === 'safety'}
                        onChange={() => updateRow(row.id, 'award_type', 'safety')}
                        required
                      />
                      <span className="radio-mark" /> <span className="label">SAFETY AWARD</span>
                    </label>
                    <label className="custom-radio">
                      <input
                        type="radio"
                        name={`award_type-${row.id}`}
                        value="leap_o"
                        checked={row.award_type === 'leap_o'}
                        onChange={() => updateRow(row.id, 'award_type', 'leap_o')}
                        required
                      />
                      <span className="radio-mark" /> <span className="label">LEAP-O EXCELLENCE</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {bulkEntries.length < 10 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '25px' }}>
              <button type="button" onClick={addRow} className="action-btn add-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add Row
              </button>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
            <button type="submit" className="submit-btn" disabled={isSubmitting} style={{ opacity: isSubmitting ? 0.7 : 1 }}>
              {isSubmitting ? 'Submitting...' : 'Submit Bulk Reward'}
            </button>
          </div>
        </form>
      ) : (
        <form key="single-form" className="coupon-container" id="couponForm" onSubmit={handleSingleSubmit}>
          <div className="header">
            <div className="logo-box">
              <img src="https://upload.wikimedia.org/wikipedia/commons/2/20/Nuvoco_Vistas_Corp_Ltd.png" alt="Nuvoco Logo" />
            </div>
            <div className="header-center">
              <div className="plant-title">Sonadih Cement Plant</div>
              <h2 className="congrats-text">Congratulations</h2>
            </div>
            <div className="logo-right">
              <img src="/safety_logo.png" alt="Safety Logo" />
            </div>
          </div>
          <div className="banner">
            <div className="banner-text">Reward &amp; Recognition • Shabhash Card • Rs. 100 On-Spot Gift</div>
          </div>
          <div className="toggle-wrapper">
            <button type="button" onClick={() => setIsBulk(false)} className={`toggle-btn ${!isBulk ? 'active' : ''}`}>Single Submit</button>
            <button type="button" onClick={() => setIsBulk(true)} className={`toggle-btn ${isBulk ? 'active' : ''}`}>Bulk Submit (HOD)</button>
          </div>
          <div className="form-grid" style={{ marginTop: '15px' }}>
            <div className="input-group col-4">
              <label htmlFor="name">Employee Name</label>
              <input type="text" id="name" name="name" placeholder="John Doe" required />
            </div>
            <div className="input-group col-4">
              <label htmlFor="dept">Department</label>
              <select id="dept" name="dept" required defaultValue="">
                <option value="" disabled>Select Dept</option>
                <option value="Sales">Sales</option>
                <option value="Production">Production</option>
                <option value="E&amp;I">E&amp;I</option>
                <option value="HR">HR</option>
                <option value="Safety">Safety</option>
                <option value="Mechanical">Mechanical</option>
                <option value="Mines">Mines</option>
                <option value="Packing">Packing</option>
                <option value="Logistics">Logistics</option>
                <option value="Quality">Quality</option>
                <option value="Accounts">Accounts</option>
                <option value="CPP/WHR">CPP/WHR</option>
                <option value="Environment">Environment</option>
              </select>
            </div>
            <div className="input-group col-4">
              <label htmlFor="contractor">Contractor</label>
              <input type="text" id="contractor" name="contractor" placeholder="If applicable" />
            </div>
            <div className="input-group col-4">
              <label htmlFor="pno">P No. (Phone)</label>
              <input type="text" id="pno" name="pno" placeholder="e.g. 9876543210" required />
            </div>
            <div className="input-group col-8">
              <label htmlFor="appreciated_for">Appreciated For</label>
              <input type="text" id="appreciated_for" name="appreciated_for" placeholder="Describe the excellent work..." required />
            </div>
            <div className="input-group col-12">
              <label htmlFor="appreciated_by">Appreciated By</label>
              <input type="text" id="appreciated_by" name="appreciated_by" placeholder="Manager or Supervisor Name" required />
            </div>
          </div>
          <div className="bottom-section">
            <div className="checkbox-container">
              <label className="custom-radio">
                <input type="radio" name="award_type" value="safety" required />
                <span className="radio-mark" />
                <span className="label">SAFETY AWARD</span>
              </label>
              <label className="custom-radio">
                <input type="radio" name="award_type" value="leap_o" required />
                <span className="radio-mark" />
                <span className="label">LEAP-O EXCELLENCE</span>
              </label>
            </div>
            <button type="submit" className="submit-btn" disabled={isSubmitting} style={{ opacity: isSubmitting ? 0.7 : 1 }}>
              <span>{isSubmitting ? 'Submitting...' : 'Submit Reward'}</span>
              {!isSubmitting && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              )}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
