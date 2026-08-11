// The last line of defence.
//
// This is a PWA that a parent may open one-handed while a four-year-old waits
// for a sticker. A render crash without this is a white screen and no way out —
// no message, no reload button, and (because the app is installed) not even
// browser chrome to retry from. Anything is better than a blank page.
//
// It deliberately does NOT try to be clever about recovery: it offers a reload,
// and — if reloading did not help, which usually means the persisted data is
// what is broken — a reseed.

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { RotateCcw, TriangleAlert } from 'lucide-react'
import { t } from '@/i18n'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Phase 2: this is where Sentry (or whatever) gets wired in. For now the
    // console is the only place to look, so make it findable.
    console.error('[Sprout] render crashed', error, info.componentStack)
  }

  reload = () => {
    this.setState({ error: null })
    window.location.href = '/'
  }

  /**
   * Nuclear option: drop the persisted blob and start from a fresh seed. Only
   * offered here, where the user has already established that the app cannot
   * render, so there is nothing left to lose by clearing it.
   */
  reseed = () => {
    try {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith('sprout.')) localStorage.removeItem(key)
      }
    } catch {
      /* nothing we can do; the reload below is still worth trying */
    }
    window.location.href = '/'
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="app-frame bg-paper text-ink">
        <div className="flex min-h-screen flex-col items-center justify-center px-8 text-center">
          <TriangleAlert size={40} className="text-berry" />
          <h1 className="mt-4 text-2xl font-extrabold">{t('crash.title')}</h1>
          <p className="mt-2 text-sm text-muted">{t('crash.body')}</p>

          <div className="mt-8 flex w-full max-w-xs flex-col gap-2">
            <button className="btn-primary w-full" onClick={this.reload}>
              {t('crash.reload')}
            </button>
            <button className="btn-ghost w-full text-muted" onClick={this.reseed}>
              <RotateCcw size={16} /> {t('crash.reset')}
            </button>
          </div>

          {/* The message, not the stack: enough for a bug report, not a wall. */}
          <p className="mt-6 max-w-xs break-words text-[11px] text-muted/70">
            {this.state.error.message}
          </p>
        </div>
      </div>
    )
  }
}
