import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<'svg'>>;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Comprehensive Documentation',
    Svg: import('@site/static/img/undraw_docusaurus_mountain.svg').default,
    description: (
      <>
        Complete documentation for 2FA Studio including architecture guides,
        API references, and development instructions.
      </>
    ),
  },
  {
    title: 'Developer Focused',
    Svg: import('@site/static/img/undraw_docusaurus_tree.svg').default,
    description: (
      <>
        Detailed technical documentation covering React, Capacitor.js, Firebase
        integration, and browser extension development.
      </>
    ),
  },
  {
    title: 'Always Up to Date',
    Svg: import('@site/static/img/undraw_docusaurus_react.svg').default,
    description: (
      <>
        Documentation is continuously updated with the latest features,
        development status, and implementation details.
      </>
    ),
  },
];

function Feature({title, Svg, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
