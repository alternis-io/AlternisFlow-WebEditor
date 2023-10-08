import { Link } from 'gatsby';
import React from 'react';
import * as styles from './header.module.scss';
import alternisLogoPath from '../../../resources/logo2.png';
import { useIsMobileLike } from '../useIsMobileLike';

const Header = () => {
  const logo = (
    <div className={styles.left}>
      {/* FIXME: make svg logo */}
      <Link className={`${styles.navLink} ${styles.alternisLogo}`} to="/">
        <img src={alternisLogoPath} width="80px" /> Alternis
      </Link>
    </div>
  );

  const links = (
    <nav className={styles.right}>
      <a className={styles.navLink}
        href={process.env.NODE_ENV === "development" ? "http://localhost:3001/app/#?trial" : "/app/#?trial"}
      >
        Try it
      </a>
      <Link className={styles.navLink} to="/roadmap">Roadmap</Link>
      <Link className={styles.navLink} to="/blog">Blog</Link>
    </nav>
  );

  const isMobileLike = useIsMobileLike();

  return (
    <header>
      {isMobileLike ? (
        <div className={styles.separate}>
          {logo} {links}
        </div>
      ) : (
        <div className={"center"} style={{ paddingTop: "50px"}}>
          {logo}
        </div>
      )}
    </header>
  );
};

export default Header;

