export default function Spinner({
  size = 32,
  thickness = 3,
  color = "#317b22",
}) {
  const style = {
    width: size,
    height: size,
    borderWidth: thickness,
    borderTopColor: color,
  };
  return <span className="spin" style={style} aria-hidden="true" />;
}
