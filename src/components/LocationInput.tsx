import { useEffect, useId, useRef, useState } from 'react'
import { reversePlace, searchPlaces } from '../api'
import type { Place } from '../api'

interface Props {
  label: string
  marker: string
  markerClass: string
  placeholder: string
  value: string
  error?: string
  onChange: (value: string) => void
  onPick: (place: Place) => void
  allowGeolocation?: boolean
}

export default function LocationInput({
  label,
  marker,
  markerClass,
  placeholder,
  value,
  error,
  onChange,
  onPick,
  allowGeolocation,
}: Props) {
  const id = useId()
  const [suggestions, setSuggestions] = useState<Place[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [locating, setLocating] = useState(false)
  // Suggestions are only fetched for text the user typed, not for a picked suggestion.
  const typed = useRef(false)
  const focused = useRef(false)

  useEffect(() => {
    if (!typed.current || value.trim().length < 2) {
      setSuggestions([])
      return
    }
    const controller = new AbortController()
    const timer = setTimeout(() => {
      searchPlaces(value, controller.signal)
        .then((places) => {
          setSuggestions(places)
          setActive(-1)
          setOpen(focused.current)
        })
        .catch(() => {})
    }, 150)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [value])

  const pick = (place: Place) => {
    typed.current = false
    onPick(place)
    setOpen(false)
  }

  const useMyLocation = () => {
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        typed.current = false
        reversePlace(coords.latitude, coords.longitude).then(onPick)
        setLocating(false)
      },
      () => setLocating(false),
      { timeout: 8000 },
    )
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!open || !suggestions.length) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((i) => (i + 1) % suggestions.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1))
    } else if (event.key === 'Enter' && active >= 0) {
      event.preventDefault()
      pick(suggestions[active])
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className={`field location-field${error ? ' has-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <div className="location-input">
        <span className={`pin ${markerClass}`}>{marker}</span>
        <input
          id={id}
          type="text"
          autoComplete="off"
          placeholder={placeholder}
          value={value}
          required
          role="combobox"
          aria-expanded={open && suggestions.length > 0}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          onChange={(event) => {
            typed.current = true
            onChange(event.target.value)
          }}
          onFocus={() => {
            focused.current = true
            setOpen(true)
          }}
          onBlur={() => {
            focused.current = false
            setOpen(false)
          }}
          onKeyDown={onKeyDown}
        />
        {allowGeolocation && 'geolocation' in navigator && (
          <button
            type="button"
            className="locate"
            onClick={useMyLocation}
            disabled={locating}
            title="Use my current location"
            aria-label="Use my current location"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3.5" />
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>
      {open && suggestions.length > 0 && (
        <ul className="suggestions" id={`${id}-list`} role="listbox">
          {suggestions.map((place, index) => (
            <li
              key={`${place.lat},${place.lng},${index}`}
              role="option"
              aria-selected={index === active}
              className={index === active ? 'active' : ''}
              // mousedown fires before the input's blur closes the list
              onMouseDown={(event) => {
                event.preventDefault()
                pick(place)
              }}
            >
              {place.label}
            </li>
          ))}
        </ul>
      )}
      {error && <p className="field-error">{error}</p>}
    </div>
  )
}
