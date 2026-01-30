# Changelog

All notable changes to the REdI Quiz Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project setup and repository structure
- Docker containerization with development and production configurations
- Backend API foundation with Express and TypeScript
- Frontend React application with Vite
- PostgreSQL database with Prisma ORM
- Nginx reverse proxy configuration
- GitHub Actions CI/CD workflows
- Comprehensive project documentation
- Claude Code integration and instructions

### Security
- JWT-based authentication system
- Email domain restriction (@health.qld.gov.au)
- Rate limiting on API endpoints
- Input validation and sanitization
- Secure password hashing with bcrypt

## [1.0.0] - TBD

### Added
- User authentication and registration
- Question bank management system
- Six question types (MCQ, True/False, Drag-Drop, Image Map, Slider)
- Quiz delivery engine with timer support
- Automated scoring with fractional scoring for multi-answer questions
- Email notifications via Power Automate
- Administrative dashboard
- User management interface
- Completion tracking and reporting
- Question bank import/export (JSON)
- Audit logging system
- Rich text editor for question content

### Features
- Token-based automatic account creation
- Configurable quiz settings (time limits, passing scores, feedback timing)
- Question and answer randomization
- Auto-save functionality during quiz attempts
- Comprehensive role-based access control (User, Editor, Admin)
- CSV export for completion data
- Database backup and restore utilities

---

## Version History

### Version Numbering
- **MAJOR**: Incompatible API changes
- **MINOR**: Added functionality (backwards-compatible)
- **PATCH**: Bug fixes (backwards-compatible)

### Support
For questions about releases, contact: redi@health.qld.gov.au
