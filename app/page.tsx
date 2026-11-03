'use client';

import { FormEvent, useEffect, useState } from 'react';

type User = { id: number; name: string; email: string; role: 'admin' | 'farmer' | 'distributor' };
type AppUser = User | false | null;
type Row = Record<string, unknown>;
type Section = 'Overview' | 'Farms' | 'Crops' | 'Harvests' | 'Inventory' | 'Orders' | 'Activity Logs';

const navByRole: Record<User['role'], Section[]> = {
  admin: ['Overview', 'Farms', 'Crops', 'Harvests', 'Inventory', 'Orders', 'Activity Logs'],
  farmer: ['Overview', 'Farms', 'Crops', 'Harvests', 'Inventory', 'Activity Logs'],
  distributor: ['Overview', 'Crops', 'Inventory', 'Orders', 'Activity Logs'],
};
const icons: Record<Section, string> = {
  Overview: '◫', Farms: '⌂', Crops: '♧', Harvests: '▤', Inventory: '▦', Orders: '⇄', 'Activity Logs': '◷',
};

export default function Home() {
  const [user, setUser] = useState<AppUser>(null);
  const [section, setSection] = useState<Section>('Overview');
  const [data, setData] = useState<{ rows?: Row[]; metrics?: Row[]; recentOrders?: Row[] }>({});
  const [inventoryOptions, setInventoryOptions] = useState<Row[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingLogId, setEditingLogId] = useState('');
  const [editingDescription, setEditingDescription] = useState('');

  async function loadMe() {
    const response = await fetch('/api/auth/me');
    if (response.ok) {
      const result = await response.json();
      setUser(result.user);
    } else {
      setUser(false);
    }
  }

  async function load(target: Section = section) {
    setError('');
    try {
      const endpoint = target === 'Overview'
        ? '/api/dashboard'
        : target === 'Activity Logs'
          ? '/api/activity-logs'
          : `/api/${target.toLowerCase()}`;
      const response = await fetch(endpoint);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not load records.');
      setData(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load records.');
      setData({});
    }
  }

  useEffect(() => { loadMe(); }, []);
  useEffect(() => { if (user) load(section); }, [user, section]);
  useEffect(() => {
    if (!user || section !== 'Orders') return;
    fetch('/api/inventory').then((response) => response.json()).then((result) => setInventoryOptions(result.rows || [])).catch(() => setInventoryOptions([]));
  }, [user, section]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(form)),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Sign-in failed.');
      setUser(result.user);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(false);
    setData({});
    setSection('Overview');
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form);
    try {
      const endpoint = section === 'Activity Logs' ? '/api/activity-logs' : `/api/${section.toLowerCase()}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not save the record.');
      setShowForm(false);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save the record.');
    } finally {
      setBusy(false);
    }
  }

  async function updateLog(id: string) {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/activity-logs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, description: editingDescription }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not update the activity log.');
      setEditingLogId('');
      await load('Activity Logs');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update the activity log.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteLog(id: string) {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/activity-logs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not delete the activity log.');
      await load('Activity Logs');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not delete the activity log.');
    } finally {
      setBusy(false);
    }
  }

  if (user === null) return <div className="login"><div className="loginbox">Loading AgriTrack…</div></div>;
  if (!user) {
    return (
      <div className="login">
        <form className="loginbox" onSubmit={login}>
          <div className="brand loginbrand">Agri<span>Track</span></div>
          <p className="muted">Agricultural Supply Chain &amp; Farm Management</p>
          <h1>Welcome back</h1>
          <p className="muted">Sign in to manage your agricultural operations.</p>
          <div className="field"><label htmlFor="email">Email address</label><input id="email" name="email" type="email" placeholder="admin@agritrack.local" autoComplete="username" required /></div>
          <div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required /></div>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn loginbutton" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          <p className="muted loginhint">Demo accounts are listed in the project README.</p>
        </form>
      </div>
    );
  }

  const rows = data.rows || [];
  const sections = navByRole[user.role];
  const canCreate = (
    (['Farms', 'Crops', 'Harvests'].includes(section) && ['admin', 'farmer'].includes(user.role))
    || (section === 'Orders' && ['admin', 'distributor'].includes(user.role))
    || section === 'Activity Logs'
  );

  return (
    <div className="shell">
      <aside className="sidebar">
        <div><div className="brand">Agri<span>Track</span></div><div className="tagline">Farm to market, connected.</div></div>
        <nav aria-label="Main navigation">
          <div className="navlabel">WORKSPACE</div>
          {sections.map((item) => (
            <button key={item} className={`navitem ${section === item ? 'active' : ''}`} onClick={() => { setSection(item); setShowForm(false); }}>
              <span aria-hidden="true">{icons[item]}</span>{item}
            </button>
          ))}
        </nav>
        <div className="sidebottom">AGRICULTURAL OPERATIONS PLATFORM<br />Version 1.0 · DBMS Level 3<br />Role: {user.role}</div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <div className="eyebrow">AGRI OPERATIONS / {section.toUpperCase()}</div>
            <h1 className="page-title">{section === 'Overview' ? `Good day, ${user.name.split(' ')[0]}` : section}</h1>
            <div className="eyebrow">{section === 'Overview' ? 'Your role-based view of agricultural operations.' : 'Records available to your account.'}</div>
          </div>
          <div className="userpill"><span className="userdot">●</span> {user.name} · {user.role}
            <button onClick={logout} className="logout">Log out</button>
          </div>
        </header>

        {error && <div className="notice errornotice" role="alert">{error}</div>}

        {section === 'Overview' ? (
          <>
            <div className="grid">
              {(data.metrics || []).map((metric) => (
                <div className="card" key={String(metric.label)}>
                  <div className="metric-label">{String(metric.label)}</div>
                  <div className="metric">{formatValue(String(metric.label), metric.value)}</div>
                  <div className="metric-foot">● Live database summary</div>
                </div>
              ))}
            </div>
            <div className="sectionhead"><h2>{user.role === 'distributor' ? 'Your recent orders' : 'Recent orders'}</h2>
              {sections.includes('Orders') && <button className="btn secondary" onClick={() => setSection('Orders')}>View orders</button>}
            </div>
            <div className="card tablewrap"><Table rows={data.recentOrders || []} cols={user.role === 'distributor' ? ['order_id', 'order_date', 'status', 'total_amount'] : ['order_id', 'buyer_name', 'order_date', 'status', 'total_amount']} /></div>
            <div className="sectionhead"><h2>How AgriTrack works</h2></div>
            <div className="grid processgrid">
              {[
                ['01', 'Cultivate', 'Farmers register farms and track crops.'],
                ['02', 'Harvest', 'Harvest records keep crop quantities traceable.'],
                ['03', 'Store', 'Warehouse inventory shows available produce.'],
                ['04', 'Distribute', 'Distributors order produce for delivery.'],
              ].map((step) => <div className="card" key={step[0]}><div className="metric-label">STEP {step[0]}</div><h3>{step[1]}</h3><div className="muted">{step[2]}</div></div>)}
            </div>
          </>
        ) : (
          <>
            <div className="sectionhead">
              <div><h2>{section} records</h2><div className="muted">{rows.length} record{rows.length === 1 ? '' : 's'}</div></div>
              <div className="toolbar">
                {canCreate && <button className="btn" onClick={() => setShowForm(!showForm)}>{showForm ? 'Close form' : `＋ Add ${singular(section)}`}</button>}
                <button className="btn secondary" onClick={() => load()}>Refresh</button>
              </div>
            </div>
            {showForm && <div className="panel formpanel"><h3>New {singular(section)}</h3><CreateForm section={section} inventoryRows={inventoryOptions} onSubmit={create} busy={busy} /></div>}
            <div className="card tablewrap">
              {section === 'Activity Logs'
                ? <ActivityTable rows={rows} user={user} editingId={editingLogId} editingDescription={editingDescription} setEditingId={setEditingLogId} setEditingDescription={setEditingDescription} save={updateLog} remove={deleteLog} busy={busy} />
                : <Table rows={rows} cols={columnsFor(section)} />}
            </div>
          </>
        )}
        <div className="eyebrow pagefoot">AgriTrack · Database Management Systems Mini Project · PES University</div>
      </main>
    </div>
  );
}

function singular(section: Section) {
  if (section === 'Farms') return 'farm';
  if (section === 'Crops') return 'crop';
  if (section === 'Harvests') return 'harvest';
  if (section === 'Orders') return 'order';
  return 'activity log';
}

function columnsFor(section: Section) {
  const columns: Record<Section, string[]> = {
    Overview: [],
    Farms: ['farm_id', 'farm_name', 'owner_name', 'location', 'land_area_acres', 'soil_type'],
    Crops: ['crop_id', 'crop_name', 'variety', 'season', 'farm_name', 'farmer_name', 'expected_yield_kg'],
    Harvests: ['harvest_id', 'farm_name', 'crop_name', 'harvest_date', 'quantity_kg', 'quality_grade'],
    Inventory: ['inventory_id', 'crop_name', 'warehouse_name', 'quantity_kg', 'unit_price', 'stock_status'],
    Orders: ['order_id', 'buyer_name', 'order_date', 'status', 'total_amount'],
    'Activity Logs': [],
  };
  return columns[section];
}

function formatValue(label: string, value: unknown) {
  if (value === null || value === undefined) return '0';
  if (label === 'Order value') return `₹${Number(value).toLocaleString('en-IN')}`;
  if (label === 'Harvested kilograms') return `${Number(value).toLocaleString('en-IN')} kg`;
  return String(value);
}

function Table({ rows, cols }: { rows: Row[]; cols: string[] }) {
  if (!rows.length) return <div className="empty">No records found. Add a record or run the sample-data seeder.</div>;
  return (
    <table className="table">
      <thead><tr>{cols.map((column) => <th key={column}>{column.replaceAll('_', ' ')}</th>)}</tr></thead>
      <tbody>{rows.map((row, index) => <tr key={String(row[cols[0]] ?? index)}>{cols.map((column) => <td key={column}>{formatCell(column, row[column])}</td>)}</tr>)}</tbody>
    </table>
  );
}

function formatCell(column: string, value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (column === 'unit_price' || column === 'total_amount') return `₹${Number(value).toLocaleString('en-IN')}`;
  if (column === 'land_area_acres') return `${Number(value).toLocaleString('en-IN')} ac`;
  if (column === 'quantity_kg' || column === 'expected_yield_kg') return `${Number(value).toLocaleString('en-IN')} kg`;
  if (column.includes('date') && typeof value === 'string') return value.replace('T', ' ').slice(0, 16);
  return String(value);
}

function CreateForm({ section, inventoryRows, onSubmit, busy }: { section: Section; inventoryRows: Row[]; onSubmit: (event: FormEvent<HTMLFormElement>) => void; busy: boolean }) {
  const availableInventory = inventoryRows.filter((row) => Number(row.quantity_kg) > 0);
  const fields: Record<string, Array<[string, string, string?]>> = {
    Farms: [['farm_name', 'Farm name'], ['location', 'Location'], ['land_area_acres', 'Land area (acres)', 'number'], ['soil_type', 'Soil type']],
    Crops: [['crop_name', 'Crop name'], ['variety', 'Variety'], ['season', 'Season'], ['farm_id', 'Farm ID', 'number'], ['expected_yield_kg', 'Expected yield (kg)', 'number']],
    Harvests: [['farm_id', 'Farm ID', 'number'], ['crop_id', 'Crop ID', 'number'], ['harvest_date', 'Harvest date', 'date'], ['quantity_kg', 'Quantity (kg)', 'number'], ['quality_grade', 'Quality grade']],
    Orders: [['quantity_kg', 'Quantity (kg)', 'number'], ['delivery_address', 'Delivery address']],
    'Activity Logs': [['event_type', 'Event type'], ['description', 'Description']],
    Overview: [], Inventory: [],
  };
  return (
    <form onSubmit={onSubmit}>
      <div className="formgrid">
        {section === 'Orders' && <div className="field"><label htmlFor="inventory_id">Inventory item</label><select id="inventory_id" name="inventory_id" defaultValue="" required><option value="" disabled>Select available produce</option>{availableInventory.map((row) => <option key={String(row.inventory_id)} value={String(row.inventory_id)}>{row.crop_name} · {row.warehouse_name} · {row.quantity_kg} kg available · ₹{row.unit_price}/kg</option>)}</select></div>}
        {fields[section].map(([name, label, type]) => (
          <div className="field" key={name}><label htmlFor={name}>{label}</label>
            {name === 'quality_grade'
              ? <select id={name} name={name} defaultValue="A" required><option value="A">A</option><option value="B">B</option><option value="C">C</option></select>
              : <input id={name} name={name} type={type || 'text'} min={type === 'number' ? (name.endsWith('_id') ? '1' : name === 'expected_yield_kg' ? '0' : '0.01') : undefined} step={type === 'number' ? (name.endsWith('_id') ? '1' : '0.01') : undefined} required />}
          </div>
        ))}
      </div>
      {section === 'Harvests' && <p className="muted formhint">The crop must belong to the farm selected above. Quality grade accepts A, B, or C.</p>}
      <div className="formactions"><button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save record'}</button></div>
    </form>
  );
}

function ActivityTable({
  rows, user, editingId, editingDescription, setEditingId, setEditingDescription, save, remove, busy,
}: {
  rows: Row[]; user: User; editingId: string; editingDescription: string;
  setEditingId: (id: string) => void; setEditingDescription: (description: string) => void;
  save: (id: string) => void; remove: (id: string) => void; busy: boolean;
}) {
  if (!rows.length) return <div className="empty">No activity logs yet. Add a field note or inspection record.</div>;
  return (
    <table className="table">
      <thead><tr><th>Event</th><th>Actor</th><th>Description</th><th>Recorded</th>{user.role === 'admin' && <th>Actions</th>}</tr></thead>
      <tbody>{rows.map((row) => {
        const id = String(row._id);
        return <tr key={id}>
          <td>{String(row.event_type || 'FIELD_NOTE')}</td>
          <td>{String(row.actor_email || '—')}</td>
          <td>{editingId === id ? <input className="inlineedit" value={editingDescription} onChange={(event) => setEditingDescription(event.target.value)} /> : String(row.description || '—')}</td>
          <td>{formatCell('created_at', row.created_at)}</td>
          {user.role === 'admin' && <td className="actions">{editingId === id
            ? <><button className="textbutton" disabled={busy} onClick={() => save(id)}>Save</button><button className="textbutton mutedbutton" onClick={() => setEditingId('')}>Cancel</button></>
            : <><button className="textbutton" onClick={() => { setEditingId(id); setEditingDescription(String(row.description || '')); }}>Edit</button><button className="textbutton deletebutton" disabled={busy} onClick={() => remove(id)}>Delete</button></>}</td>}
        </tr>;
      })}</tbody>
    </table>
  );
}
