import { getIDEMetadata } from './ideMetadata';

export const formatIDEName = (ideName: string): string => {
  return getIDEMetadata(ideName)?.label ?? ideName;
};
