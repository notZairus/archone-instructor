import { Label } from "./ui/label";
import { Input } from "./ui/input";

const InputField = ({
  label = "Label",
  htmlFor = "",
  type = "text",
  placeholder = "",
  value,
  onChange,
}) => {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      <Input
        id={htmlFor}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
    </div>
  );
};

export default InputField;
