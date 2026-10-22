# Deterministic organizer acceptance

## Release contract

Organization must work without a model, AI connection or Guide endpoint. File decisions must be explainable by filename, metadata/heading/opening text, literal keyword rules or file-type fallback. Ambiguous/failed reading must not create invented titles. Original files are never changed by planning or copying.

## Automated coverage

Naming preservation; generic names and title styles; XML entities; missing metadata; configurable rule validation; literal keyword matching; deterministic ties; cache isolation by filename/rules; non-network planning; 2-page PDF bound; unsupported images; drag/drop limits; cancellation and worker deadline/next-file recovery; approval requirements; path sanitization/reserved names; duplicate destinations; source changes; verified copy; rollback retaining modified outputs; Guide input/resource controls.

## Browser acceptance procedure

Development server > Quick Guide > Run organizer benchmark. Creates 100 then 500 unique synthetic documents across TXT/MD/CSV/DOCX/PDF/XLSX/PPTX. Planning calls the real browser parser worker. Known title/category expectations are checked. Approved copies are written through production copyApproved into browser-owned OPFS, SHA-256 verified and reopened to confirm presence and size. Generator time is excluded; copy timing includes manifest persistence and read-back. Browser UI rendering of a full review list and native destination-picker performance are separate from this engine benchmark.

These generated documents have explicit identifiable headings and rules. Perfect fixture matches are not real-world accuracy statistics. No private assignments/backups are accessed. A commercial claim requires wider owner/beta workloads, complex/encrypted/scanned examples and representative disk/network storage testing.
