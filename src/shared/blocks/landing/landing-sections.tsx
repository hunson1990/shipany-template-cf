'use client';

import {
  Features,
  FeaturesList,
  FeaturesAccordion,
  FeaturesStep,
  Stats,
  Testimonials,
  Faq,
  Cta,
  Subscribe,
} from '@/themes/default/blocks';

export function LandingSections({ sections }: { sections: any }) {
  return (
    <>
      {sections.introduce && <FeaturesList section={sections.introduce} />}
      {sections.benefits && <FeaturesAccordion section={sections.benefits} />}
      {sections.usage && <FeaturesStep section={sections.usage} />}
      {sections.features && <Features section={sections.features} />}
      {sections.stats && <Stats section={sections.stats} />}
      {sections.testimonials && <Testimonials section={sections.testimonials} />}
      {sections.faq && <Faq section={sections.faq} />}
      {sections.cta && <Cta section={sections.cta} />}
      {sections.subscribe && <Subscribe section={sections.subscribe} />}
    </>
  );
}
