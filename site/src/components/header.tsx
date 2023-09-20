import { Link } from 'gatsby';
import React from 'react';
import * as styles from './header.module.scss';

const Header = () => (
  <header>
    <div className={styles.separate}>
      <div className={styles.left}>
        <Link className={styles.navLink} to="/">Home</Link>
        <Link className={styles.navLink} to="/blog">Blog</Link>
      </div>
      <div className={styles.right}></div>
    </div>
    <hr/>
  </header>
);


export default Header;

