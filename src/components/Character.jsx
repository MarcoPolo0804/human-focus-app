export default function Character({ stage, sick }) {
  return (
    <div className={`character-stage character-pose-${stage.pose}`}>
      <img
        className={`character-img${sick ? ' character-img-sick' : ''}`}
        src={stage.image}
        alt={stage.name}
      />
    </div>
  );
}
