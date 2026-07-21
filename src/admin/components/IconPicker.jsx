import { SAFE_ICON_IDS, SafeIcon } from "../../components/project-visuals/iconRegistry.jsx";
import { SelectField } from "./AdminUi.jsx";

export default function IconPicker({ value, onChange, label = "İkon" }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-end gap-3">
      <SelectField label={label} value={value} onChange={(event) => onChange(event.target.value)}>
        {SAFE_ICON_IDS.map((icon) => <option key={icon} value={icon}>{icon}</option>)}
      </SelectField>
      <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-canvas text-accent" aria-hidden><SafeIcon name={value} /></span>
    </div>
  );
}
