/**
 * @file        AdminPage
 * @description Admin dashboard with tabs for stats, completions, logs, invites
 */

import { useSearchParams } from 'react-router-dom';
import { AdminDashboard } from './AdminDashboard';
import { CompletionsTab } from './CompletionsTab';
import { LogsTab } from './LogsTab';
import { InvitesTab } from './InvitesTab';
import { UsersTab } from './UsersTab';
import { QuestionBanksTab } from './QuestionBanksTab';
import styles from './AdminPage.module.css';

type Tab = 'dashboard' | 'users' | 'banks' | 'completions' | 'logs' | 'invites';

const TABS: { id: Tab; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'users', label: 'Users' },
  { id: 'banks', label: 'Question Banks' },
  { id: 'completions', label: 'Completions' },
  { id: 'logs', label: 'Audit Logs' },
  { id: 'invites', label: 'Invitations' },
];

export function AdminPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const VALID_TABS: Tab[] = ['dashboard', 'users', 'banks', 'completions', 'logs', 'invites'];
  const rawTab = searchParams.get('tab');
  const activeTab: Tab = rawTab && VALID_TABS.includes(rawTab as Tab) ? (rawTab as Tab) : 'dashboard';

  function setTab(tab: Tab) {
    setSearchParams({ tab });
  }

  function handleTabKeyDown(e: React.KeyboardEvent) {
    const tabs = VALID_TABS;
    const current = tabs.indexOf(activeTab);
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = tabs[(current + 1) % tabs.length] as Tab;
      setTab(next);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = tabs[(current - 1 + tabs.length) % tabs.length] as Tab;
      setTab(prev);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Administration</h1>
      </header>

      <nav className={styles.tabs} role="tablist" aria-label="Admin sections" onKeyDown={handleTabKeyDown}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
            onClick={() => setTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div
        className={styles.content}
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
      >
        {activeTab === 'dashboard' && <AdminDashboard />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'banks' && <QuestionBanksTab />}
        {activeTab === 'completions' && <CompletionsTab />}
        {activeTab === 'logs' && <LogsTab />}
        {activeTab === 'invites' && <InvitesTab />}
      </div>
    </div>
  );
}
