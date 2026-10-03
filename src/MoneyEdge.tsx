import { BaseEdge, type EdgeProps } from '@xyflow/react';
/** Parallel money transfers stay individually inspectable; built on React Flow's MIT BaseEdge. */
export function MoneyEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  markerEnd,
  label,
  style,
  data,
}: EdgeProps) {
  const bend = Number(data?.bend ?? 0);
  const midX = (sourceX + targetX) / 2;
  const path = `M ${sourceX} ${sourceY} C ${midX} ${sourceY + bend}, ${midX} ${targetY + bend}, ${targetX} ${targetY}`;
  return (
    <BaseEdge
      path={path}
      markerEnd={markerEnd}
      style={style}
      interactionWidth={24}
      label={label}
      labelX={midX}
      labelY={(sourceY + targetY) / 2 + bend * 0.75}
      labelStyle={{ fontSize: 11, fill: '#435c3c' }}
      labelShowBg
      labelBgStyle={{ fill: '#fff', stroke: '#e1e8d8' }}
      labelBgPadding={[9, 5]}
      labelBgBorderRadius={4}
    />
  );
}
export const moneyEdgeTypes = { money: MoneyEdge };
