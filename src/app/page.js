'use client';

import { useState } from 'react';

export default function Home() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBulk, setIsBulk] = useState(false);
  const [appreciatedBy, setAppreciatedBy] = useState('');
  const [dept, setDept] = useState('');
  const [appreciateddept, setappreciateddept] = useState('');
  const [globalContractor, setGlobalContractor] = useState('');
  const [isContractorGlobal, setIsContractorGlobal] = useState(false);
  const [bulkEntries, setBulkEntries] = useState([
    { id: Date.now(), name: '', contractor: '', pno: '', appreciated_for: '', award_type: '' },
  ]);

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
      appreciateddept,
      dept,
      isContractorGlobal,
      globalContractor,
      entries: bulkEntries.map(({ id, ...rest }) => ({
        ...rest,
        contractor: isContractorGlobal ? globalContractor : rest.contractor,
      })),
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
          .map((r) => `${r.name}: ${r.message || r.reason || r.status || ''}`)
          .join('\n');
        alert(messages);
        setAppreciatedBy('');
        setDept('');
        setappreciateddept('');
        setBulkEntries([{ id: Date.now(), name: '', contractor: '', pno: '', appreciated_for: '', award_type: '' }]);
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

  const DEPARTMENTS = [
    ['Civil_New_Works', 'Civil & New Works'],
    ['HR', 'HR'],
    ['Packing', 'Packing Plant'],
    ['QA', 'QA'],
    ['Plant_Inventory', 'Plant Inventory'],
    ['Safety', 'Safety'],
    ['Finance', 'Finance'],
    ['Logistics', 'Logistics'],
    ['Operations', 'Operations'],
    ['Process', 'Process'],
    ['Environment', 'Environment'],
    ['CPP/WHR', 'CPP/WHR'],
    ['Mechanical', 'Mechanical'],
    ['E&I', 'E&I'],
    ['Production', 'Production'],
    ['Inspection_leap_o', 'Inspection & Leap-O'],
    ['Mines', 'Mines'],
    ['IT', 'IT'],
  ];

  const DeptSelect = ({ id, name, value, onChange, required, defaultValue }) => (
    <select id={id} name={name} value={value} onChange={onChange} required={required} defaultValue={defaultValue}>
      <option value="" disabled>Select department</option>
      {DEPARTMENTS.map(([val, label]) => (
        <option key={val} value={val}>{label}</option>
      ))}
    </select>
  );

  const ContextNotice = () => (
    <div className="context-notice">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <p>
        This is an internal employee reward and recognition portal for <strong>Nuvoco Vistas Corp Ltd, Sonadih Cement Plant</strong>.
        Only authorised managers may submit Shabhash Cards. Phone numbers are collected solely for reward notification via our internal system.
      </p>
    </div>
  );

  const Header = () => (
    <>
      <div className="header">
        <div className="logo-box">
          <img src="/nuvoco_logo.png" alt="Nuvoco Vistas Corp Ltd" />
        </div>
        <div className="header-center">
          <div className="plant-title">Sonadih Cement Plant</div>
          <div className="congrats-text">Shabhash Card</div>
        </div>
        <div className="logo-right">
          <img src="/safety_logo.png" alt="Safety" />
        </div>
      </div>
      <div className="banner">
        <div className="banner-text">Reward &amp; Recognition Programme</div>
      </div>
    </>
  );

  return (
    <main>
      {isBulk ? (
        <form key="bulk-form" className="coupon-container" onSubmit={handleBulkSubmit}>
          <Header />
          <ContextNotice />

          <div className="toggle-wrapper">
            <button type="button" onClick={() => setIsBulk(false)} className={`toggle-btn ${!isBulk ? 'active' : ''}`}>Single Submit</button>
            <button type="button" onClick={() => setIsBulk(true)} className={`toggle-btn ${isBulk ? 'active' : ''}`}>Bulk Submit</button>
          </div>

          <div className="form-grid" style={{ marginTop: '20px' }}>
            <div className="input-group col-6">
              <label htmlFor="appreciated_by">Appreciated By (HOD)</label>
              <input type="text" id="appreciated_by" name="appreciated_by" placeholder="Manager or supervisor name" required value={appreciatedBy} onChange={(e) => setAppreciatedBy(e.target.value)} />
            </div>
            <div className="input-group col-6">
              <label htmlFor="appreciateddept">Appreciator Department</label>
              <DeptSelect id="appreciateddept" name="appreciateddept" value={appreciateddept} onChange={(e) => setappreciateddept(e.target.value)} required />
            </div>
            <div className="input-group col-6">
              <label htmlFor="dept">Employee Department</label>
              <DeptSelect id="dept" name="dept" value={dept} onChange={(e) => setDept(e.target.value)} required />
            </div>
            <div className="input-group col-6 inline-toggle" style={{ justifyContent: 'flex-start', paddingTop: '22px' }}>
              <input type="checkbox" id="globalContractorToggle" checked={isContractorGlobal} onChange={(e) => setIsContractorGlobal(e.target.checked)} className="global-contract-toggle" />
              <label htmlFor="globalContractorToggle" className="global-contract-label">Same contractor for all</label>
            </div>
            {isContractorGlobal && (
              <div className="input-group col-6">
                <label htmlFor="globalContractor">Contractor (all employees)</label>
                <input type="text" id="globalContractor" placeholder="Contractor name" value={globalContractor} onChange={(e) => setGlobalContractor(e.target.value)} />
              </div>
            )}
          </div>

          {bulkEntries.map((row, idx) => (
            <div key={row.id} className="bulk-row" style={{ marginTop: idx === 0 ? '20px' : undefined }}>
              <h4>
                Employee #{idx + 1}
                <button type="button" onClick={() => removeRow(row.id)} className="action-btn delete-btn">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  Remove
                </button>
              </h4>
              <div className="form-grid" style={{ padding: 0, marginTop: 0 }}>
                <div className="input-group col-4">
                  <label>Employee Name</label>
                  <input type="text" value={row.name} onChange={(e) => updateRow(row.id, 'name', e.target.value)} placeholder="Full name" required />
                </div>
                <div className="input-group col-4">
                  <label>Employee ID</label>
                  <input type="text" value={row.empid} onChange={(e) => updateRow(row.id, 'empid', e.target.value)} placeholder="e.g. EMP123456" required />
                </div>
                <div className="input-group col-4">
                  <label>Phone Number</label>
                  <input type="text" value={row.pno} onChange={(e) => updateRow(row.id, 'pno', e.target.value)} placeholder="10-digit mobile number" required />
                </div>
                {!isContractorGlobal && (
                  <div className="input-group col-4">
                    <label>Contractor</label>
                    <input type="text" value={row.contractor} onChange={(e) => updateRow(row.id, 'contractor', e.target.value)} placeholder="If applicable" />
                  </div>
                )}
                <div className="input-group col-8">
                  <label>Appreciated For</label>
                  <input type="text" value={row.appreciated_for} onChange={(e) => updateRow(row.id, 'appreciated_for', e.target.value)} placeholder="Describe the excellent work or behaviour" required />
                </div>
                <div className="input-group col-12">
                  <label>Award Type</label>
                  <div className="checkbox-container">
                    <label className="custom-radio">
                      <input type="radio" name={`award_type-${row.id}`} value="safety" checked={row.award_type === 'safety'} onChange={() => updateRow(row.id, 'award_type', 'safety')} required />
                      <span className="radio-mark" />
                      <span className="label">Safety Award</span>
                    </label>
                    <label className="custom-radio">
                      <input type="radio" name={`award_type-${row.id}`} value="leap_o" checked={row.award_type === 'leap_o'} onChange={() => updateRow(row.id, 'award_type', 'leap_o')} required />
                      <span className="radio-mark" />
                      <span className="label">Leap-O Excellence</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {bulkEntries.length < 10 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 32px 8px' }}>
              <button type="button" onClick={addRow} className="action-btn add-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Employee
              </button>
            </div>
          )}

          <div className="bottom-section" style={{ justifyContent: 'flex-end' }}>
            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting…' : 'Submit Bulk Rewards'}
              {!isSubmitting && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              )}
            </button>
          </div>
        </form>
      ) : (
        <form key="single-form" className="coupon-container" id="couponForm" onSubmit={handleSingleSubmit}>
          <Header />
          <ContextNotice />

          <div className="toggle-wrapper">
            <button type="button" onClick={() => setIsBulk(false)} className={`toggle-btn ${!isBulk ? 'active' : ''}`}>Single Submit</button>
            <button type="button" onClick={() => setIsBulk(true)} className={`toggle-btn ${isBulk ? 'active' : ''}`}>Bulk Submit</button>
          </div>

          <div className="form-grid">
            <div className="input-group col-4">
              <label htmlFor="name">Employee Name</label>
              <input type="text" id="name" name="name" placeholder="Full name" required />
            </div>
            <div className="input-group col-4">
              <label htmlFor="empid">Employee ID</label>
              <input type="text" id="empid" name="empid" placeholder="e.g. EMP123456" required />
            </div>
            <div className="input-group col-4">
              <label htmlFor="dept">Department</label>
              <DeptSelect id="dept" name="dept" defaultValue="" required />
            </div>
            <div className="input-group col-4">
              <label htmlFor="contractor">Contractor</label>
              <input type="text" id="contractor" name="contractor" placeholder="If applicable" />
            </div>
            <div className="input-group col-4">
              <label htmlFor="pno">Phone Number</label>
              <input type="text" id="pno" name="pno" placeholder="10-digit mobile number" required />
            </div>
            <div className="input-group col-4">
              <label htmlFor="appreciated_by">Appreciated By</label>
              <input type="text" id="appreciated_by" name="appreciated_by" placeholder="Manager or supervisor name" required />
            </div>
            <div className="input-group col-8">
              <label htmlFor="appreciated_for">Appreciated For</label>
              <input type="text" id="appreciated_for" name="appreciated_for" placeholder="Describe the excellent work or behaviour" required />
            </div>
            <div className="input-group col-4">
              <label htmlFor="appreciateddept">Appreciator Department</label>
              <DeptSelect id="appreciateddept" name="appreciateddept" defaultValue="" required />
            </div>
          </div>

          <div className="bottom-section">
            <div className="checkbox-container">
              <label className="custom-radio">
                <input type="radio" name="award_type" value="safety" required />
                <span className="radio-mark" />
                <span className="label">Safety Award</span>
              </label>
              <label className="custom-radio">
                <input type="radio" name="award_type" value="leap_o" required />
                <span className="radio-mark" />
                <span className="label">Leap-O Excellence</span>
              </label>
            </div>
            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting…' : 'Submit Reward'}
              {!isSubmitting && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              )}
            </button>
          </div>
        </form>
      )}

      <div className="privacy-footer">
        <a href="/privacy">Privacy Policy</a>
        {' · '}
        <span>Nuvoco Vistas Corp Ltd</span>
      </div>
    </main>
  );
}
