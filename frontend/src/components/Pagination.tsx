import React from 'react'

/**
 * Pagination component with page numbers, ellipsis and previous/next controls.
 *
 * This component renders a sequence of page number buttons along with
 * Previous and Next controls. If there are many pages, it will collapse
 * middle pages into an ellipsis to avoid overwhelming the user. The active
 * page is highlighted. Disabled controls are styled accordingly.
 */
export interface PaginationProps {
  /**
   * Current active page (1-indexed).
   */
  currentPage: number
  /**
   * Total number of pages.
   */
  totalPages: number
  /**
   * Callback invoked when the user selects a different page.
   */
  onPageChange: (page: number) => void
}

/**
 * Compute a list of pagination items. Each item is either a number
 * representing a page, or the string 'ellipsis'. This logic ensures
 * that the first and last pages are always shown, the current page
 * and its immediate neighbours are visible, and ellipses are used
 * when the range would otherwise become too long.
 */
function getPageItems(currentPage: number, totalPages: number): (number | 'ellipsis')[] {
  const items: (number | 'ellipsis')[] = []
  const visibleCount = 2 // number of adjacent pages to show on each side
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) {
      items.push(i)
    }
    return items
  }
  const showLeftEllipsis = currentPage - visibleCount > 2
  const showRightEllipsis = currentPage + visibleCount < totalPages - 1
  items.push(1)
  if (showLeftEllipsis) {
    items.push('ellipsis')
  }
  const start = showLeftEllipsis ? Math.max(2, currentPage - visibleCount) : 2
  const end = showRightEllipsis ? Math.min(totalPages - 1, currentPage + visibleCount) : totalPages - 1
  for (let i = start; i <= end; i++) {
    items.push(i)
  }
  if (showRightEllipsis) {
    items.push('ellipsis')
  }
  items.push(totalPages)
  return items
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  const pageItems = getPageItems(currentPage, totalPages)
  return (
    <nav className="pagination" aria-label="Pagination">
      {/* Previous */}
      <button
        className={`page-button ${currentPage === 1 ? 'disabled' : ''}`}
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        aria-label="Previous page"
      >
        ‹
      </button>
      {pageItems.map((item, idx) => {
        if (item === 'ellipsis') {
          return (
            <span key={`ellipsis-${idx}`} className="page-ellipsis">
              …
            </span>
          )
        }
        const pageNumber = item as number
        return (
          <button
            key={pageNumber}
            className={`page-button ${currentPage === pageNumber ? 'current' : ''}`}
            onClick={() => onPageChange(pageNumber)}
            aria-current={currentPage === pageNumber ? 'page' : undefined}
          >
            {pageNumber}
          </button>
        )
      })}
      {/* Next */}
      <button
        className={`page-button ${currentPage === totalPages ? 'disabled' : ''}`}
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        aria-label="Next page"
      >
        ›
      </button>
    </nav>
  )
}

export default Pagination