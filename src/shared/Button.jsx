import './shared.css';

/**
 * Botón base de la plataforma.
 *
 * variant: 'primary' | 'secondary' | 'ghost' | 'danger'
 * size:    'sm' | 'md' | 'lg'
 * showPendingTag: false sólo cuando un rótulo de grupo ya indica "pendiente".
 * pending: marca la acción como "pendiente de implementar". El botón queda
 *          deshabilitado, muestra la etiqueta PENDIENTE y un tooltip explicativo.
 *          Es la única forma permitida de mostrar una acción que todavía no funciona.
 */
export default function Button({
  children,
  variant = 'secondary',
  size = 'md',
  pending = false,
  pendingNote = 'Disponible en una fase futura',
  showPendingTag = true,
  icon = null,
  className = '',
  disabled,
  ...rest
}) {
  const classes = [
    'bh-btn',
    `bh-btn--${variant}`,
    `bh-btn--${size}`,
    pending ? 'bh-btn--pending' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={classes}
      disabled={pending || disabled}
      title={pending ? `Pendiente: ${pendingNote}` : rest.title}
      aria-disabled={pending || disabled}
      {...rest}
    >
      {icon && <span className="bh-btn__icon" aria-hidden="true">{icon}</span>}
      <span className="bh-btn__label">{children}</span>
      {pending && showPendingTag && <span className="bh-btn__pending">Pendiente</span>}
    </button>
  );
}
