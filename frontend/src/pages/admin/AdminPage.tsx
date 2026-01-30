/**
 * @file        AdminPage
 * @description Admin dashboard with tabs for stats, completions, logs, invites
 */

import { useState } from 'react';
import { AdminDashboard } from './AdminDashboard';
import { CompletionsTab } from './CompletionsTab';
import { LogsTab } from './LogsTab';
import { InvitesTab } from './InvitesTab';
import styles from './AdminPage.module.css';

type Tab = 'dashboard' | 'completions' | 'logs' | 'invites';

const TABS: { id: Tab; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'completions', label: 'Completions' },
  { id: 'logs', label: 'Audit Logs' },
  { id: 'invites', label: 'Invitations' },
];

export function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Administration</h1>
      </header>

      <nav className={styles.tabs} role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className={styles.content} role="tabpanel">
        {activeTab === 'dashboard' && <AdminDashboard />}
        {activeTab === 'completions' && <CompletionsTab />}
        {activeTab === 'logs' && <LogsTab />}
        {activeTab === 'invites' && <InvitesTab />}
      </div>
    </div>
  );
}
