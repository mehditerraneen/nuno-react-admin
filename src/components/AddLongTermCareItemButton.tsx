import React from "react";
import { useSimpleFormIterator, useTranslate } from "react-admin";
import { Button } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

export const AddLongTermCareItemButton = () => {
  const { add } = useSimpleFormIterator();
  const translate = useTranslate();

  return (
    <Button
      variant="outlined"
      color="primary"
      startIcon={<AddIcon />}
      sx={{ mt: 2, mb: 2 }}
      onClick={() => add()}
    >
      Add Long Term Care Item
    </Button>
  );
};

export default AddLongTermCareItemButton;
