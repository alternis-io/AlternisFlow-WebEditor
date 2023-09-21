import { Link } from 'gatsby';
import React from 'react';
import * as styles from './header.module.scss';

const Header = () => (
  <header>
    <div className={styles.separate}>
      <div className={styles.left}>
        <Link className={styles.navLink} to="/">Alternis</Link>
      </div>
      <div className={styles.right}>
        <Link className={styles.navLink} to="/app">Try it</Link>
        <Link className={styles.navLink} to="/roadmap">Roadmap</Link>
        <Link className={styles.navLink} to="/blog">Blog</Link>
      </div>
    </div>
  </header>
);

export default Header;

