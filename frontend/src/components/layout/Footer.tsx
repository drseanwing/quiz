/**
 * @file        Footer component
 * @description Application footer with copyright and links
 */

import styles from './Footer.module.css';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <span className={styles.copyright}>
          &copy; {year} Resuscitation EDucation Initiative (REdI)
        </span>
        <div className={styles.links}>
          <a
            href="https://health.qld.gov.au"
            className={styles.link}
            target="_blank"
            rel="noopener noreferrer"
          >
            Queensland Health
          </a>
        </div>
      </div>
    </footer>
  );
}
