import { FALLOW, OTHER_CROP, SUGGESTED_CROPS, UNKNOWN_CROP } from "@/lib/agroshift/crops";
import { cn } from "@/lib/utils";

import { NativeSelect, inputClass } from "./form-controls";

export function CropSelect({
  id,
  value,
  other,
  onChange,
  onOtherChange,
  invalid,
  describedBy,
  allowNone,
  placeholder = "Select crop",
}: {
  id: string;
  value: string;
  other: string;
  onChange: (v: string) => void;
  onOtherChange: (v: string) => void;
  invalid?: boolean;
  describedBy?: string;
  allowNone?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <NativeSelect id={id} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={invalid} aria-describedby={describedBy}>
        <option value="">{placeholder}</option>
        {allowNone && <option value="None">No second crop</option>}
        {SUGGESTED_CROPS.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
        <option value={FALLOW}>{FALLOW}</option>
        <option value={UNKNOWN_CROP}>{UNKNOWN_CROP}</option>
        <option value={OTHER_CROP}>Other crop — type the name</option>
      </NativeSelect>
      {value === OTHER_CROP && (
        <input
          aria-label="Crop name"
          className={cn(inputClass)}
          value={other}
          maxLength={60}
          placeholder="Type the crop name"
          onChange={(e) => onOtherChange(e.target.value)}
          aria-invalid={invalid}
        />
      )}
    </div>
  );
}
