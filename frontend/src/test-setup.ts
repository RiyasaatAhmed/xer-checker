// Runs before every test file.
import '@testing-library/jest-dom/vitest' // matchers like toBeInTheDocument()
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(cleanup) // remove each test's page, so the next test starts empty
