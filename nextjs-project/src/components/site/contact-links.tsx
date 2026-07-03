const PHONE = '+7 (989) 103-91-92'
const EMAIL = 'innerhealth@mail.ru'

const linkButtonClass =
  'p-2.5 rounded-full border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-400 hover:text-gray-900 transition-colors flex items-center justify-center shrink-0'

export function ContactLinks() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={`tel:${PHONE.replace(/\s|\(|\)|-/g, '')}`}
        className={linkButtonClass}
        aria-label="Позвонить"
      >
        <PhoneIcon />
      </a>
      <a
        href={`mailto:${EMAIL}`}
        className={linkButtonClass}
        aria-label="Написать на почту"
      >
        <MailIcon />
      </a>
    </div>
  )
}

function PhoneIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  )
}
