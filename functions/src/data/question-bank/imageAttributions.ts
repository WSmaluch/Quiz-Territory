import { IMAGE_SOURCES } from './imageSources.generated';

export type ImageAttribution = {
  attributionId: string;
  title: string;
  author: string;
  sourceUrl: string;
  license: string;
  licenseUrl: string;
};

export const IMAGE_ATTRIBUTIONS: ImageAttribution[] = IMAGE_SOURCES.map((source) => ({
  attributionId: `attr-${source.questionId}`,
  title: source.title,
  author: source.author,
  sourceUrl: source.sourcePageUrl,
  license: source.license,
  licenseUrl: source.licenseUrl,
}));
