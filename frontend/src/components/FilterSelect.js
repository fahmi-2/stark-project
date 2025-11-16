// FilterSelect.js
import React from 'react';

const FilterSelect = ({ value, onChange, options }) => (
  <select value={value} onChange={onChange}>
    {options.map(option => (
      <option key={option.value} value={option.value}>{option.label}</option>
    ))}
  </select>
);

export default FilterSelect;
