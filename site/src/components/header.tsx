import { Link } from 'gatsby';
import React from 'react';
import * as styles from './header.module.scss';
import alternisLogoPath from '../../../resources/logo2.png';

const Header = () => (
  <header>
    <div className={styles.separate}>
      <div className={styles.left}>
        {/* FIXME: make svg logo */}
        <Link className={`${styles.navLink} ${styles.alternisLogo}`} to="/">
          Alternis <img src={alternisLogoPath} width="50px" />
        </Link>
      </div>
      <nav className={styles.right}>
        <Link className={styles.navLink} to="/app">Try it</Link>
        <Link className={styles.navLink} to="/roadmap">Roadmap</Link>
        <Link className={styles.navLink} to="/blog">Blog</Link>
      </nav>
    </div>
  </header>
);

export default Header;

