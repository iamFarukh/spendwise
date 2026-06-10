export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  parentId?: string | null;
  /** System categories are not shown in manual pickers. */
  system?: boolean;
}
