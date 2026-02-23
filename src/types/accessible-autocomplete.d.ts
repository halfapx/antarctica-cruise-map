declare module "accessible-autocomplete" {
  type EnhanceSelectOptions = {
    selectElement: HTMLSelectElement;
    autoselect?: boolean;
    showAllValues?: boolean;
    defaultValue?: string;
  };

  const accessibleAutocomplete: {
    enhanceSelectElement: (options: EnhanceSelectOptions) => void;
  };

  export default accessibleAutocomplete;
}
