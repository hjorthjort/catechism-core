const hierarchyPrefix = /^(Part|Section|Chapter|Article|Paragraph)\s+(\w+):\s*/i;

export function cleanHierarchyLabel(value: string) {
  return value.replace(hierarchyPrefix, '');
}
