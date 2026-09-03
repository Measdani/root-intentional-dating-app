# Rooted Hearts Phase 3

## Added

- Protected `Learning Content` area in the admin navigation
- Lesson creation and editing across all four learning areas
- Separate shared, female-perspective, and male-perspective lesson fields
- Draft and published lesson states
- Lesson ordering, timing, reflection, and action-step fields
- Private member-question review queue
- Anonymized-question editing before publication
- Official Rooted Hearts answer field
- Explicit publish/unpublish control
- Published-answer table separated from the private submission table
- Member library loading of admin-published lessons and approved answers
- Starter-lesson seeding when the admin opens the new content area for the first time

## Required deployment order

1. Apply `202609030001_remove_dating_member_directory.sql`.
2. Apply `202609030002_learning_platform_foundation.sql`.
3. Apply `202609030003_admin_learning_content.sql`.
4. Deploy the application source.
5. Sign in as an administrator and open **Learning Content** once to seed the starter lessons.
6. Test with a separate non-admin member account.

## Privacy behavior

The private member-question table remains visible only to the submitting member and administrators. Published Q&A content is copied into a separate approved-answer table that contains the anonymized wording and official answer, preventing other members from receiving the original submission or sender ID.
