const PHONE = '+7 (989) 103-91-92'
const EMAIL = 'innerhealth@mail.ru'

const linkButtonClass =
  'inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50 hover:border-gray-400 transition-colors shrink-0'

export function ContactLinks() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={`tel:${PHONE.replace(/\s|\(|\)|-/g, '')}`}
        className={linkButtonClass}
      >
        Позвонить
      </a>
      <a
        href={`mailto:${EMAIL}`}
        className={linkButtonClass}
      >
        Написать
      </a>
    </div>
  )
}
