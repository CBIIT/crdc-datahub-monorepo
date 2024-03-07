import {
  Checkbox,
  CheckboxProps,
  FormControlLabel,
  FormControlLabelProps,
  styled,
} from "@mui/material";
import { FC } from "react";
import { ReactComponent as CheckboxCheckedIcon } from "../../assets/icons/checkbox_checked.svg";
import { StyledLabel } from "./TextInput";

const StyledCheckboxCheckedIcon = styled(CheckboxCheckedIcon)<{
  readOnly?: boolean;
}>(({ readOnly }) => ({
  width: "16px",
  height: "16px",
  color: "#1D91AB",
  backgroundColor: readOnly ? "#E5EEF4" : "initial",
  cursor: readOnly ? "not-allowed" : "pointer",
}));

const StyledCheckboxUncheckedIcon = styled("div")<{ readOnly?: boolean }>(
  ({ readOnly }) => ({
    width: "16px",
    height: "16px",
    color: "#083A50",
    outline: "2px solid #1D91AB",
    outlineOffset: -2,
    backgroundColor: readOnly ? "#E5EEF4" : "initial",
    cursor: readOnly ? "not-allowed" : "pointer",
  })
);

const StyledFormControlLabel = styled(FormControlLabel)(() => ({
  marginRight: 0,
}));

const StyledCheckbox = styled(Checkbox)(() => ({
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: "11px",
  paddingRight: "8px",
}));

export const UncheckedIcon = styled("div")<{ readOnly?: boolean }>(
  ({ readOnly }) => ({
    outline: "2px solid #1D91AB",
    outlineOffset: -2,
    width: "16px",
    height: "16px",
    backgroundColor: readOnly ? "#E5EEF4" : "initial",
    color: "#083A50",
    cursor: readOnly ? "not-allowed" : "pointer",
  })
);

type Props = {
  label: string;
  idPrefix?: string;
  formControlLabelProps?: FormControlLabelProps;
} & CheckboxProps;

const LabelCheckbox: FC<Props> = ({
  label,
  idPrefix,
  formControlLabelProps,
  checked,
  name,
  value,
  onChange,
  readOnly,
  ...rest
}) => (
  <StyledFormControlLabel
    label={<StyledLabel>{label}</StyledLabel>}
    control={(
      <>
        <StyledCheckbox
          id={idPrefix?.concat(`-${label.toLowerCase().replace(" ", "-")}-label-checkbox`)}
          checked={checked}
          onChange={onChange}
          readOnly={readOnly}
          icon={<StyledCheckboxUncheckedIcon readOnly={readOnly} />}
          checkedIcon={<StyledCheckboxCheckedIcon readOnly={readOnly} />}
          {...rest}
        />
        {/* NOTE: This is a proxy element for form parsing purposes. */}
        <input
          name={name}
          type="checkbox"
          data-type="boolean"
          value={checked ? "true" : "false"}
          onChange={() => { }}
          aria-labelledby={`${idPrefix}-label`}
          checked
          hidden
        />
      </>
    )}
    {...formControlLabelProps}
  />
);

export default LabelCheckbox;
