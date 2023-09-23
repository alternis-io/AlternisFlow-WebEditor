import { Link } from 'gatsby';
import React from 'react';
import * as styles from './header.module.scss';
import alternisLogoPath from '../images/logo1.png';

const Header = () => (
  <header>
    <div className={styles.separate}>
      <div className={styles.left}>
        <Link className={styles.navLink} to="/"><img src={alternisLogoPath} width="250px" /></Link>
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

