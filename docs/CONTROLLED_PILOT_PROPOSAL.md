# SafeDose Controlled Pilot Proposal

## Executive Summary

This document outlines a controlled pilot program for SafeDose, an AI-assisted dose calculator for injectable medications. The pilot is designed to validate safety measures, assess real-world accuracy, and establish protocols for safe deployment while minimizing risk to participants.

**Key Objectives:**
- Validate dose calculation accuracy in real-world settings (>99% target)
- Test safety mechanisms and error handling
- Establish monitoring and incident response protocols
- Gather user feedback for product improvement
- Build evidence for broader deployment

**Duration:** 12 weeks (3 phases of 4 weeks each)

**Target Participants:** 30-50 healthcare professionals and experienced patients

---

## 1. Pilot Overview

### 1.1 Purpose

The controlled pilot serves to:

1. **Validate Safety Systems**: Test all built-in safety measures (volume thresholds, error detection, pre-dose confirmation)
2. **Measure Accuracy**: Compare SafeDose calculations against manual verification by healthcare professionals
3. **Identify Edge Cases**: Discover failure modes not captured in current evaluation framework
4. **Refine User Experience**: Gather feedback on usability, clarity, and workflow integration
5. **Build Trust**: Generate evidence-based data on safety and accuracy
6. **Establish Protocols**: Develop incident response and monitoring procedures for wider release

### 1.2 Scope

**In Scope:**
- Manual dose entry calculations
- AI-powered syringe and vial recognition (limited)
- Dose logging and tracking
- Pre-dose safety review features
- Unit conversion calculations
- Reconstitution calculations

**Out of Scope (Pilot Restrictions):**
- Critical care or emergency medications
- Pediatric dosing (requires specialized protocols)
- High-risk medications (chemotherapy, anticoagulants, insulin adjustments for Type 1 diabetes)
- Doses requiring reconstitution beyond standard protocols
- Integration with electronic medical records (EMR)

### 1.3 Safety Philosophy

**Core Principle:** SafeDose is a calculation aid, not a replacement for professional judgment.

All pilot participants must:
- Be trained healthcare professionals OR experienced patients with documented training
- Independently verify ALL calculations before administration
- Have access to healthcare professional supervision
- Report all discrepancies, errors, or concerns immediately

---

## 2. Pilot Phases

### Phase 1: Controlled Internal Testing (Weeks 1-4)

**Participants:** 5-10 healthcare professionals from partner clinics/practices

**Objectives:**
- Validate basic calculation accuracy in supervised settings
- Test safety warning systems
- Refine incident reporting protocols
- Establish baseline accuracy metrics

**Activities:**
- **Week 1-2:** Initial training and orientation
  - Review app features and limitations
  - Establish verification protocols
  - Set up secure communication channels
  - Baseline competency assessment
- **Week 3-4:** Supervised usage
  - All calculations reviewed by supervising pharmacist/physician
  - Daily check-ins with pilot coordinators
  - Structured feedback sessions

**Safety Measures:**
- All calculations verified by independent healthcare professional before administration
- Daily safety reviews by pilot team
- Immediate suspension protocol if accuracy falls below 95%
- 24/7 incident reporting hotline

**Success Criteria:**
- >99% calculation accuracy (verified against manual calculations)
- Zero critical safety incidents
- <5% user-reported confusion or uncertainty
- All participants complete training and verification protocols

### Phase 2: Expanded Supervised Testing (Weeks 5-8)

**Participants:** 20-30 healthcare professionals and experienced patients

**Objectives:**
- Scale testing to diverse use cases and medications
- Validate AI scanning features in real-world conditions
- Test usage tracking and limit systems
- Gather comprehensive feedback on user experience

**Activities:**
- **Week 5:** Onboarding and training new participants
  - Same training protocols as Phase 1
  - Pairing with Phase 1 participants for mentorship
- **Week 6-8:** Active usage with weekly verification reviews
  - Independent verification required for all critical doses
  - Weekly accuracy audits
  - Semi-structured interviews for feedback

**Expansion Criteria:**
- Must maintain >99% accuracy from Phase 1
- Zero unresolved safety incidents from Phase 1
- Positive participant feedback on safety features
- Validated incident reporting system

**Safety Measures:**
- Mandatory independent verification for all administrations
- Weekly safety audits by pilot team
- Automated alerts for calculation errors or unusual patterns
- Mid-phase safety review with external advisor

**Success Criteria:**
- Maintain >98% calculation accuracy across expanded user base
- AI scanning accuracy >90% for common syringe types
- <10% of doses require re-calculation
- Positive safety perception scores (>4/5)

### Phase 3: Monitored Real-World Usage (Weeks 9-12)

**Participants:** Up to 50 total participants (including Phase 1 & 2 participants)

**Objectives:**
- Test in real-world conditions with reduced supervision
- Validate long-term usability and accuracy
- Establish sustainable monitoring procedures
- Prepare for wider release

**Activities:**
- **Week 9:** Transition planning and protocols
  - Establish self-verification guidelines
  - Set up automated monitoring systems
  - Create participant support resources
- **Week 10-12:** Monitored independent usage
  - Reduced verification requirements for experienced users
  - Continued mandatory verification for complex calculations
  - Weekly usage reports and safety metrics

**Transition Criteria:**
- Maintained >98% accuracy through Phase 2
- Participants demonstrate consistent verification habits
- Incident reporting system proven effective
- Positive user confidence in app safety features

**Safety Measures:**
- Automated monitoring of all calculations
- Weekly safety reports to pilot team
- Random audit of 10% of calculations
- Quarterly external safety review
- Immediate notification system for potential errors

**Success Criteria:**
- Sustained >98% calculation accuracy
- Zero critical safety incidents
- High participant confidence (>4/5) in using app independently
- Established sustainable monitoring and support systems

---

## 3. Participant Selection

### 3.1 Inclusion Criteria

**Healthcare Professionals:**
- Licensed pharmacist, nurse, physician, or physician assistant
- Current active practice in relevant clinical setting
- Experience with injectable medication administration (>1 year)
- Access to pharmacy or medical supervision
- Willingness to follow verification protocols
- Commitment to complete pilot duration

**Experienced Patients:**
- Age ≥18 years
- Documented training in self-administration of injectable medications
- Currently managing chronic condition requiring regular injections (>6 months)
- Has established relationship with healthcare provider
- Healthcare provider endorsement required
- Demonstrated competency in dose calculation and administration
- Willingness to follow verification protocols
- Access to healthcare professional for questions/concerns

### 3.2 Exclusion Criteria

**Participants who:**
- Work primarily with pediatric populations (during pilot)
- Administer high-risk medications excluded from pilot scope
- Cannot commit to verification and reporting requirements
- Do not have reliable smartphone/device access
- Have visual impairments affecting accurate dose measurement
- Are not fluent in English (until multi-language support validated)
- Have conflicts of interest (financial, competitive) with SafeDose

### 3.3 Recruitment Strategy

**Healthcare Professionals:**
- Partner with 3-5 clinics/practices specializing in relevant conditions
- Recruitment through professional networks and associations
- Academic medical centers with research programs
- Continuing education programs

**Experienced Patients:**
- Referrals from participating healthcare professionals
- Patient advocacy group partnerships
- Diabetes, GLP-1, and hormone therapy communities
- Support group outreach (with proper permissions)

### 3.4 Informed Consent

All participants must provide written informed consent acknowledging:

- SafeDose is experimental and not FDA-approved
- Independent verification is mandatory
- Participation is voluntary and can be withdrawn
- Data collection and usage policies
- Incident reporting requirements
- Potential risks and mitigation strategies
- Right to ask questions and receive support

---

## 4. Safety Measures and Protocols

### 4.1 Built-In App Safety Features

**Pre-Calculation Safety:**
- Unit compatibility validation
- Concentration format verification
- Input range validation

**Calculation Safety:**
- Volume threshold enforcement (0.005 mL - 2 mL safe range)
- Syringe capacity checks
- Cross-validation of unit conversions
- Flagging of unusual dose calculations

**Pre-Administration Safety:**
- Mandatory pre-dose confirmation screen
- Summary of all calculation inputs
- Volume warning for doses >1 mL
- Safety reminder to verify with healthcare professional
- Clear error messages for invalid scenarios

**Post-Dose Safety:**
- Optional feedback collection on dose experience
- Adverse event reporting mechanism
- Dose logging for tracking patterns

### 4.2 Pilot-Specific Safety Protocols

**Verification Requirements:**

**Tier 1 (Mandatory Independent Verification):**
- First-time use of new medication
- Reconstitution calculations
- Doses outside typical ranges
- AI scan results (until proven reliable)
- Any calculation with volume >1 mL
- All doses during Phase 1

**Tier 2 (Self-Verification with Documentation):**
- Routine medications with established patterns
- Standard concentrations
- Manual entry calculations (Phase 2+)
- Participant must document verification method

**Tier 3 (App-Assisted with Spot Checks):**
- Highly experienced users (Phase 3)
- Well-established medication routines
- Still requires self-verification
- Subject to random audits

**Incident Reporting:**

**Level 1 (Immediate Report - Within 1 Hour):**
- Calculation error discovered before administration
- Near-miss events
- Safety feature failure
- Significant user confusion leading to hesitation

**Level 2 (Same-Day Report - Within 24 Hours):**
- Minor calculation discrepancies
- Usability issues affecting safety
- AI scanning errors
- Feedback on safety warnings

**Level 3 (Weekly Report):**
- General usability feedback
- Feature requests
- Non-safety-related issues

**Reporting Channels:**
- In-app incident reporting feature (priority)
- 24/7 emergency hotline (critical incidents)
- Email to pilot coordinator (non-urgent)
- Weekly feedback surveys

### 4.3 Monitoring and Oversight

**Daily Monitoring:**
- Automated alerts for calculation errors
- Review of all incident reports
- System health checks

**Weekly Reviews:**
- Aggregate accuracy metrics
- Incident pattern analysis
- Participant engagement and compliance
- Safety feature effectiveness

**Monthly Reviews:**
- Comprehensive safety assessment
- External advisor consultation
- Participant satisfaction surveys
- Decision on phase progression

**Quarterly Reviews:**
- Independent safety board review
- Publication of anonymized safety data
- Community feedback integration
- Regulatory consideration assessment

### 4.4 Stopping Criteria (Pilot Suspension/Termination)

**Immediate Suspension Triggers:**
- Critical safety incident (serious adverse event possibly related to app)
- Calculation accuracy falls below 90%
- System failure affecting safety features
- Participant non-compliance with verification protocols
- Regulatory or legal concerns

**Phase Termination Triggers:**
- Failure to meet phase success criteria
- Sustained accuracy below 95%
- Multiple Level 1 incidents in same category
- Participant dropout >40%
- Unresolved safety concerns after review

**Full Pilot Termination Triggers:**
- Fundamental safety flaw discovered
- Unable to maintain >95% accuracy across phases
- Systematic errors in core calculation logic
- Loss of institutional support or funding
- Regulatory prohibition

---

## 5. Success Metrics and Evaluation

### 5.1 Primary Safety Metrics

**Calculation Accuracy:**
- Target: >99% exact match with manual verification
- Measurement: Random audit of 10% of calculations per participant weekly
- Benchmark: Compare against established evaluation framework

**Error Detection Rate:**
- Target: >95% of invalid inputs properly flagged
- Measurement: Deliberate invalid input tests monthly
- Benchmark: Evaluation framework error handling tests

**Safety Feature Effectiveness:**
- Target: 100% display of safety warnings when triggered
- Measurement: Automated logging and manual verification
- Benchmark: No missed warnings in test scenarios

**Incident Rate:**
- Target: Zero critical safety incidents
- Target: <5 Level 1 incidents per 1000 calculations
- Measurement: Incident report tracking and analysis
- Benchmark: Industry standards for medical calculation apps

### 5.2 Secondary Performance Metrics

**AI Scanning Accuracy:**
- Target: >90% correct syringe type identification
- Target: >85% correct concentration extraction from labels
- Measurement: Manual verification against ground truth
- Benchmark: Evaluation framework scanning tests

**User Confidence:**
- Target: >4/5 average confidence rating
- Measurement: Weekly confidence surveys
- Benchmark: Pre-pilot baseline surveys

**Usability:**
- Target: <10% of calculations require restart
- Target: Average task completion time <3 minutes
- Measurement: App usage analytics and user feedback
- Benchmark: Usability testing from development

**Adoption and Engagement:**
- Target: >80% weekly active users
- Target: Average 3+ calculations per active user per week
- Measurement: Usage tracking analytics
- Benchmark: Pilot design expectations

### 5.3 Qualitative Assessment

**Structured Interviews:**
- End of each phase with all participants
- Topics: safety perception, usability, workflow integration, trust
- Analysis: Thematic coding and synthesis

**Feedback Surveys:**
- Weekly short surveys (5 questions)
- Monthly comprehensive surveys (20 questions)
- Topics: specific features, pain points, improvement suggestions

**Use Case Documentation:**
- Collection of real-world scenarios and edge cases
- Documentation of workarounds or adaptations
- Identification of unmet needs

### 5.4 Evaluation Timeline

**Weekly:**
- Safety metrics dashboard review
- Incident analysis
- Quick participant pulse check

**Monthly:**
- Comprehensive safety and performance report
- Stakeholder presentation
- Phase decision checkpoints

**End of Pilot:**
- Final comprehensive evaluation report
- Comparison against all success criteria
- Recommendations for broader deployment
- Publication of findings (anonymized)

---

## 6. Risk Assessment and Mitigation

### 6.1 Identified Risks

**Risk 1: Calculation Error Leading to Incorrect Dose**

- **Severity:** Critical
- **Likelihood:** Low (with current safety measures)
- **Mitigation:**
  - Mandatory independent verification in pilot
  - Volume threshold enforcement
  - Pre-dose confirmation screens
  - Comprehensive testing before pilot
  - Daily monitoring of all calculations
- **Response:** Immediate investigation, participant notification, calculation methodology review

**Risk 2: Over-Reliance on App Without Verification**

- **Severity:** High
- **Likelihood:** Medium (human factor)
- **Mitigation:**
  - Extensive training on verification requirements
  - Regular reminders in app interface
  - Safety culture messaging
  - Monitoring compliance through audits
  - Graduated verification tiers requiring demonstrated competency
- **Response:** Re-training, increased supervision, possible exclusion from pilot

**Risk 3: AI Scanning Misidentification**

- **Severity:** High
- **Likelihood:** Medium (emerging technology)
- **Mitigation:**
  - User confirmation required for all AI results
  - Clear uncertainty indicators
  - Option to override or manual entry
  - Higher verification requirements for scanned data
  - Continuous monitoring of scan accuracy
- **Response:** Investigation of failure modes, prompt engineering, model improvement

**Risk 4: Technical Failure or System Outage**

- **Severity:** Medium
- **Likelihood:** Low
- **Mitigation:**
  - Offline calculation capability
  - Local data storage
  - System health monitoring
  - Backup communication channels
  - Participant training on backup procedures
- **Response:** Immediate user notification, fallback to manual calculation, technical team investigation

**Risk 5: Participant Non-Compliance with Protocols**

- **Severity:** Medium-High
- **Likelihood:** Medium
- **Mitigation:**
  - Thorough training and competency assessment
  - Regular compliance monitoring
  - Audit system for verification
  - Clear consequences for non-compliance
  - Supportive communication and reminders
- **Response:** Individual counseling, increased oversight, possible exclusion

**Risk 6: Data Privacy or Security Breach**

- **Severity:** High
- **Likelihood:** Low
- **Mitigation:**
  - HIPAA-compliant data handling (if applicable)
  - Encryption of stored and transmitted data
  - Minimal personal data collection
  - Regular security audits
  - Participant education on data practices
- **Response:** Immediate containment, participant notification, regulatory reporting, security enhancement

**Risk 7: Insufficient Incident Reporting**

- **Severity:** Medium
- **Likelihood:** Medium
- **Mitigation:**
  - Multiple easy reporting channels
  - Non-punitive reporting culture
  - Regular prompts and reminders
  - Recognition for reporting
  - Clear explanation of importance
- **Response:** Increase outreach, simplify reporting, analyze barriers

**Risk 8: Adverse Patient Outcome (Unrelated to App)**

- **Severity:** Critical
- **Likelihood:** Very Low (baseline risk)
- **Mitigation:**
  - Careful participant selection
  - Clear app limitations documentation
  - Emergency contact information readily available
  - Protocol for medical emergencies
  - Separation of app use from clinical decision-making
- **Response:** Immediate medical support, thorough investigation, regulatory reporting if required

### 6.2 Risk Monitoring

**Ongoing Risk Assessment:**
- Weekly risk register review
- Incident trend analysis
- Near-miss pattern identification
- Emerging risk identification

**Risk Communication:**
- Regular risk updates to participants
- Transparent reporting to oversight board
- Clear escalation procedures
- Documentation of risk evolution

### 6.3 Emergency Response Plan

**Critical Incident Protocol:**

1. **Immediate Actions (Within 1 Hour):**
   - Participant safety assessment and support
   - Pilot coordinator notification
   - Incident documentation initiation
   - Consider pilot suspension if appropriate

2. **Short-Term Actions (Within 24 Hours):**
   - Full incident investigation
   - Root cause analysis initiation
   - Notification to all relevant stakeholders
   - Implement immediate corrective measures
   - Communication to all pilot participants

3. **Long-Term Actions (Within 1 Week):**
   - Complete investigation report
   - Systematic solution development
   - Safety protocol updates
   - Re-training of participants if needed
   - Decision on pilot continuation

**Communication Channels:**
- 24/7 emergency hotline: [To be established]
- Pilot coordinator email: [To be established]
- In-app emergency reporting feature
- Backup SMS/text system for critical alerts

---

## 7. Data Collection and Analysis

### 7.1 Data Categories

**Usage Data:**
- Calculation frequency and patterns
- Feature utilization (manual vs. AI scan)
- Time spent on each screen/step
- Error rates and types
- Verification method used
- Session duration and completion rates

**Accuracy Data:**
- Calculation inputs and outputs
- Manual verification results
- Discrepancy identification and resolution
- AI scanning accuracy (when used)
- Unit conversion accuracy
- Reconstitution calculation accuracy

**Safety Data:**
- All incident reports (Level 1-3)
- Near-miss events
- Safety warning displays
- User verification compliance
- Error messages shown
- Threshold violations

**User Feedback Data:**
- Weekly survey responses
- Monthly comprehensive feedback
- Structured interview responses
- Free-text comments and suggestions
- Confidence and satisfaction ratings
- Feature prioritization inputs

**Clinical Context Data (Optional, De-identified):**
- Medication types and categories
- Typical dose ranges
- Administration contexts
- User background categories
- Use case patterns

### 7.2 Data Collection Methods

**Automated In-App:**
- Usage analytics (anonymous by default)
- Error logging
- Calculation logging (with user consent)
- Scan result capture
- Safety feature activation tracking

**Manual Reporting:**
- Incident report forms
- Verification documentation
- Weekly feedback surveys
- Monthly comprehensive surveys
- Structured interview responses

**Audit Verification:**
- Random calculation audits (10% sample)
- Verification method spot checks
- Safety protocol compliance checks
- Data quality validation

### 7.3 Data Privacy and Security

**Principles:**
- Minimal data collection (only what's needed)
- De-identification where possible
- User consent for all non-essential data
- Secure storage and transmission
- HIPAA compliance (if applicable)
- Transparent data policies

**Specific Measures:**
- Encrypted data storage
- Secure cloud infrastructure (Firebase with security rules)
- Access controls and audit logs
- Regular security assessments
- Data retention policies
- User right to delete data

**Participant Rights:**
- Access to their own data
- Right to correct inaccuracies
- Right to withdraw and delete data
- Transparency in data usage
- Option to opt-out of non-essential collection

### 7.4 Analysis Plan

**Weekly Analysis:**
- Descriptive statistics on usage and accuracy
- Incident report summaries
- Immediate pattern detection
- Safety metric dashboard

**Monthly Analysis:**
- Comparative analysis across participants
- Trend analysis over time
- Feature effectiveness assessment
- Sub-group analysis (healthcare professionals vs. experienced patients)

**End-of-Phase Analysis:**
- Comprehensive accuracy assessment
- Success criteria evaluation
- Qualitative feedback synthesis
- Recommendations for next phase

**Final Pilot Analysis:**
- Complete dataset analysis
- Statistical significance testing
- Comparison to pre-pilot benchmarks
- Predictive modeling for broader deployment
- Publication-quality report preparation

### 7.5 Reporting and Transparency

**Internal Reporting:**
- Weekly safety reports to pilot team
- Monthly stakeholder updates
- Phase transition decision documents
- Continuous improvement tracking

**External Reporting:**
- Monthly anonymized summaries (public)
- End-of-phase public reports
- Final pilot comprehensive report (public)
- Academic publication (if appropriate)
- Regulatory submissions (if required)

**Participant Reporting:**
- Weekly individual usage summaries
- Monthly aggregate pilot progress
- Immediate notification of safety concerns
- Recognition of contributions

---

## 8. Training and Support

### 8.1 Participant Training Program

**Pre-Pilot Training (Required for All Participants):**

**Module 1: SafeDose Overview (30 minutes)**
- Application purpose and scope
- Features and limitations
- Safety philosophy
- Pilot objectives

**Module 2: Calculation Principles (45 minutes)**
- How dose calculations work
- Unit conversions
- Concentration vs. total amount
- Reconstitution basics
- Common error sources

**Module 3: App Features and Usage (60 minutes)**
- Hands-on walkthrough
- Manual entry process
- AI scanning (when available)
- Syringe selection
- Pre-dose confirmation
- Dose logging

**Module 4: Safety and Verification (60 minutes)**
- Verification requirements (Tier 1-3)
- Independent verification methods
- Recognizing calculation errors
- Safety warning interpretation
- When to seek help
- Case studies and scenarios

**Module 5: Pilot Protocols (45 minutes)**
- Incident reporting procedures
- Data collection and privacy
- Communication channels
- Weekly requirements
- Support resources
- Rights and responsibilities

**Module 6: Assessment (30 minutes)**
- Knowledge quiz (80% passing score)
- Practical calculation verification
- Scenario-based questions
- Review of incorrect answers

**Total Time: ~4 hours** (can be completed in segments)

**Phase-Specific Training:**
- Phase 2: AI scanning features and verification (30 minutes)
- Phase 3: Independent usage guidelines (30 minutes)

### 8.2 Ongoing Support

**Support Channels:**

**Tier 1: In-App Help**
- Contextual help tooltips
- FAQ section
- Tutorial videos
- Troubleshooting guides

**Tier 2: Pilot Coordinator**
- Email support (response within 24 hours)
- Weekly office hours (video call)
- Community discussion forum (moderated)

**Tier 3: Emergency Support**
- 24/7 hotline for critical issues
- Direct line to pilot leadership
- Medical professional consultation (if needed)

**Regular Touchpoints:**
- Weekly email check-ins
- Monthly group video calls
- Mid-phase individual check-ins
- End-of-phase feedback sessions

### 8.3 Continuing Education

**Weekly Tips:**
- Best practices for verification
- Feature highlights
- Common pitfalls to avoid
- User success stories

**Monthly Webinars:**
- Deep dives on specific features
- Q&A sessions
- Case study discussions
- Guest speakers (pharmacists, physicians)

**Resource Library:**
- Video tutorials
- Downloadable guides
- Medication-specific protocols
- Quick reference cards

### 8.4 Community Building

**Peer Support:**
- Participant forum for questions
- Buddy system (Phase 1 mentors Phase 2)
- Success story sharing
- Collaborative learning

**Recognition:**
- Acknowledgment in final report
- Certificates of participation
- First access to new features
- Contribution to medical technology advancement

---

## 9. Regulatory and Ethical Considerations

### 9.1 Regulatory Status

**Current Status:**
- SafeDose is NOT an FDA-approved medical device
- Considered educational/informational software
- Not intended to diagnose, treat, or prescribe

**Pilot Considerations:**
- Pilot is research/evaluation activity
- May require IRB (Institutional Review Board) approval
- Informed consent essential
- Compliance with 21 CFR Part 11 (if applicable)

**Future Considerations:**
- Path to FDA clearance (if pursued)
- De Novo classification potential
- Medical Device Data Systems (MDDS) consideration
- Software as a Medical Device (SaMD) framework

### 9.2 Ethical Principles

**Beneficence:**
- Pilot designed to benefit participants and future users
- Focus on safety and accuracy improvements
- Contribution to medication administration knowledge

**Non-Maleficence:**
- Do no harm through rigorous safety measures
- Conservative approach to risk
- Immediate response to safety concerns
- Transparent about limitations

**Autonomy:**
- Voluntary participation
- Informed consent
- Right to withdraw at any time
- User control over data

**Justice:**
- Fair participant selection
- Equitable access to pilot
- Diverse representation where possible
- Benefits and burdens fairly distributed

### 9.3 Informed Consent Elements

**Required Disclosures:**
- Purpose of pilot and research nature
- Procedures and time commitment
- Risks and discomforts
- Benefits (individual and societal)
- Alternatives to participation
- Confidentiality and data handling
- Voluntary nature and right to withdraw
- Contact information for questions
- Compensation (if any)

**Special Considerations:**
- Clarity that app is not approved medical device
- Emphasis on independent verification requirement
- Understanding of incident reporting duty
- Acknowledgment of potential risks
- Opportunity to ask questions

### 9.4 Institutional Review Board (IRB)

**IRB Approval:**
- Required if pilot involves human subjects research
- Application should include:
  - Protocol document (this document)
  - Informed consent forms
  - Recruitment materials
  - Data security plan
  - Safety monitoring plan

**Ongoing IRB Reporting:**
- Adverse event reporting
- Protocol modifications
- Annual review
- Study completion report

### 9.5 Liability and Insurance

**Considerations:**
- Professional liability coverage for pilot team
- Participant liability protections
- Clear delineation of responsibilities
- Legal review of all agreements
- Insurance requirements for institutions

---

## 10. Budget and Resources

### 10.1 Personnel

**Pilot Director (0.5 FTE):**
- Overall pilot management
- Stakeholder communication
- Safety oversight
- Budget: $60,000 (6 months @ $10,000/month)

**Clinical Coordinator (Pharmacist or Physician, 0.3 FTE):**
- Clinical oversight
- Participant training
- Safety review
- Medical consultation
- Budget: $30,000 (6 months @ $5,000/month)

**Data Analyst (0.25 FTE):**
- Data collection and analysis
- Dashboard creation
- Report generation
- Budget: $15,000 (6 months @ $2,500/month)

**Technical Support (0.2 FTE):**
- App support
- Bug fixes
- Feature updates
- Budget: $15,000 (6 months @ $2,500/month)

**Administrative Support (0.1 FTE):**
- Participant coordination
- Scheduling
- Documentation
- Budget: $6,000 (6 months @ $1,000/month)

**Total Personnel: $126,000**

### 10.2 Technology and Infrastructure

**Cloud Services:**
- Expanded Firebase services
- Data storage and analytics
- Budget: $2,000

**Communication Platform:**
- Video conferencing
- Forum/discussion platform
- Budget: $1,000

**Survey and Data Collection Tools:**
- Qualtrics or similar
- Budget: $2,000

**Security and Compliance:**
- HIPAA compliance tools
- Security audits
- Budget: $5,000

**Total Technology: $10,000**

### 10.3 Participant Costs

**Training Materials:**
- Video production
- Printed guides
- Online courses
- Budget: $5,000

**Participant Compensation (Optional):**
- Time compensation ($50/participant)
- Survey incentives ($10/survey)
- Budget: $3,000 (50 participants × $50 + surveys)

**Total Participant: $8,000**

### 10.4 Other Costs

**Legal and Regulatory:**
- IRB application fees
- Legal review
- Insurance
- Budget: $10,000

**External Oversight:**
- Safety board consultation
- Expert advisors
- Budget: $5,000

**Dissemination:**
- Report publication
- Conference presentation
- Public communication
- Budget: $3,000

**Contingency (10%):**
- Unexpected costs
- Budget: $16,200

**Total Other: $34,200**

### 10.5 Total Budget

**Total Pilot Budget: $178,200**

**Budget by Phase:**
- Phase 1 (Planning & Setup): $60,000
- Phase 2 (Execution): $80,000
- Phase 3 (Analysis & Reporting): $38,200

**Funding Sources:**
- Research grants
- Healthcare institution partnerships
- Corporate sponsorship (with disclosure)
- Non-profit foundation support

---

## 11. Timeline and Milestones

### Pre-Pilot (Weeks -8 to -1)

**Week -8 to -6: Planning and Approval**
- Finalize pilot protocol
- IRB application submission
- Legal review and contracts
- Budget approval
- Team assembly

**Week -5 to -3: Infrastructure Setup**
- Communication platform setup
- Data collection systems
- Training materials development
- Participant recruitment initiation
- Safety monitoring dashboard creation

**Week -2 to -1: Participant Onboarding**
- Participant selection and consent
- Initial training sessions
- Pre-pilot assessment
- System access provision
- Final safety protocol review

### Phase 1: Controlled Internal Testing (Weeks 1-4)

**Week 1:**
- Pilot launch
- Initial participant orientation
- Daily check-ins begin
- Safety monitoring activation

**Week 2:**
- Continue supervised usage
- First incident review
- Early feedback collection
- System performance check

**Week 3:**
- Mid-phase assessment
- Training refresher if needed
- Accuracy audit
- Participant feedback session

**Week 4:**
- End-of-phase evaluation
- Phase 1 report completion
- Phase 2 decision
- Phase 2 preparation

**Phase 1 Milestones:**
- ✓ All participants trained and active
- ✓ 100% verification compliance achieved
- ✓ Safety monitoring operational
- ✓ >99% calculation accuracy demonstrated
- ✓ Incident reporting system validated
- ✓ Go/No-Go decision for Phase 2

### Phase 2: Expanded Supervised Testing (Weeks 5-8)

**Week 5:**
- Phase 2 launch
- New participant onboarding
- AI scanning feature introduction
- Expanded monitoring

**Week 6:**
- Continue active usage
- Weekly accuracy audits
- Mid-phase feedback surveys
- First monthly review

**Week 7:**
- Scale-up assessment
- AI scanning performance review
- User experience interviews
- Safety culture check

**Week 8:**
- End-of-phase evaluation
- Phase 2 report completion
- Phase 3 decision
- Phase 3 preparation

**Phase 2 Milestones:**
- ✓ Expanded to 20-30 participants
- ✓ Maintained >98% accuracy at scale
- ✓ AI scanning >90% accuracy achieved
- ✓ Positive user satisfaction
- ✓ Safety systems validated at scale
- ✓ Go/No-Go decision for Phase 3

### Phase 3: Monitored Real-World Usage (Weeks 9-12)

**Week 9:**
- Phase 3 launch
- Transition to independent usage guidelines
- Reduced supervision protocols
- Automated monitoring emphasis

**Week 10:**
- Sustained usage monitoring
- Random audit program
- Long-term usability assessment
- Weekly reporting continues

**Week 11:**
- Final data collection push
- Comprehensive participant surveys
- Individual exit interviews
- Preliminary analysis

**Week 12:**
- Pilot conclusion
- Final safety review
- Data analysis completion
- Final report drafting begins

**Phase 3 Milestones:**
- ✓ Demonstrated independent usage safety
- ✓ Sustained accuracy and reliability
- ✓ Scalable monitoring procedures established
- ✓ User confidence validated
- ✓ Comprehensive dataset collected
- ✓ Recommendations for broader deployment

### Post-Pilot (Weeks 13-16)

**Week 13-14:**
- Final report completion
- Stakeholder presentations
- External review
- Publication preparation

**Week 15-16:**
- Public report release
- Academic submission
- Community feedback
- Next steps planning

---

## 12. Success Criteria Summary

### Phase 1 Success Criteria (Must Meet All)
- [ ] >99% calculation accuracy (verified audits)
- [ ] Zero critical safety incidents
- [ ] 100% participant training completion
- [ ] 100% verification protocol compliance
- [ ] Incident reporting system functional
- [ ] <5% user-reported confusion
- [ ] Positive safety perception (>4/5)

### Phase 2 Success Criteria (Must Meet All)
- [ ] Maintain >98% calculation accuracy
- [ ] AI scanning >90% accuracy (common syringes)
- [ ] Zero unresolved safety concerns
- [ ] Successful scale to 20-30 participants
- [ ] >80% weekly active usage
- [ ] <10% calculations require restart
- [ ] Positive user satisfaction (>4/5)

### Phase 3 Success Criteria (Must Meet All)
- [ ] Sustained >98% calculation accuracy
- [ ] Zero critical safety incidents
- [ ] >80% participant retention
- [ ] High user confidence (>4/5) in independent use
- [ ] Automated monitoring system validated
- [ ] Sustainable support model established
- [ ] Clear recommendations for wider deployment

### Overall Pilot Success Criteria
- [ ] All phase criteria met
- [ ] Comprehensive safety evidence compiled
- [ ] Positive participant feedback
- [ ] Scalable model demonstrated
- [ ] Regulatory path clarified (if pursuing)
- [ ] Community confidence established
- [ ] Published findings (anonymized)

---

## 13. Next Steps and Broader Deployment

### 13.1 Post-Pilot Decision Framework

**Scenario A: Complete Success (All Criteria Met)**
- Proceed with broader beta release
- Implement learnings from pilot
- Scale monitoring systems
- Expand to additional medication types
- Consider regulatory pathway

**Scenario B: Partial Success (Most Criteria Met)**
- Address specific gaps identified
- Conduct targeted follow-up testing
- Iterate on problem areas
- Consider limited release with restrictions
- Re-evaluate timeline

**Scenario C: Significant Concerns**
- Pause broader deployment
- Conduct thorough root cause analysis
- Implement fundamental improvements
- Re-design pilot if needed
- Maintain transparency with stakeholders

### 13.2 Broader Deployment Recommendations

**If Pilot Succeeds:**

**Phase 4: Limited Beta Release (3-6 months)**
- Expand to 200-500 users
- Maintain enhanced monitoring
- Continue verification recommendations
- Refine based on pilot learnings
- Build automated safety systems

**Phase 5: Public Release (6-12 months)**
- General availability with safety features
- Comprehensive user education
- Ongoing monitoring and improvement
- Community evaluation framework
- Potential regulatory approval pursuit

**Long-Term Vision:**
- Integration with healthcare systems
- Enhanced AI capabilities
- Pediatric and high-risk medication expansion
- Multi-language support
- VisionOS and wearable integration
- Academic and clinical validation studies

### 13.3 Continuous Improvement

**Community Evaluation Framework:**
- Open evaluation dataset (Evals.md expansion)
- Community contributions encouraged
- Transparent accuracy reporting
- Regular model updates
- Feedback integration

**Safety Culture:**
- Never stop independent verification
- Continuous safety feature enhancement
- Transparent incident reporting
- Learning from near-misses
- Culture of responsibility

---

## 14. Conclusion

This controlled pilot program represents a measured, safety-first approach to validating SafeDose in real-world settings. By progressing through three carefully designed phases with clear success criteria, safety measures, and monitoring protocols, we can:

1. **Build Evidence**: Generate rigorous data on safety and accuracy
2. **Minimize Risk**: Protect participants through multiple safety layers
3. **Gather Insights**: Learn from real-world use to improve the product
4. **Establish Trust**: Demonstrate commitment to safety and transparency
5. **Enable Broader Impact**: Create foundation for wider deployment

The pilot acknowledges that SafeDose is a tool to assist, not replace, professional judgment. Through mandatory verification, comprehensive training, and robust monitoring, we can validate its value while maintaining the highest safety standards.

Success will be measured not just by accuracy metrics, but by:
- Zero critical safety incidents
- High participant confidence and satisfaction
- Sustainable monitoring and support models
- Clear path forward for broader deployment
- Contribution to medical technology safety knowledge

We approach this pilot with humility, recognizing that we are handling a tool that impacts human health. Every safeguard, every verification requirement, every monitoring system is designed with one goal: ensuring that SafeDose helps people safely manage their medications.

---

## Appendices

### Appendix A: Sample Informed Consent Form
*[To be developed with legal and IRB guidance]*

### Appendix B: Incident Report Form Template
*[To be developed with safety team]*

### Appendix C: Training Materials Outline
*[To be developed with clinical educator]*

### Appendix D: Verification Protocol Detailed Procedures
*[To be developed with pharmacist oversight]*

### Appendix E: Data Collection Forms and Surveys
*[To be developed with research team]*

### Appendix F: Communication Templates
*[To be developed with pilot coordinator]*

### Appendix G: Safety Monitoring Dashboard Specifications
*[To be developed with data analyst]*

### Appendix H: External Resources and References
*[To be compiled]*

---

**Document Version:** 1.0  
**Last Updated:** 2025-10-10  
**Next Review:** Upon pilot approval  
**Owner:** SafeDose Pilot Team  
**Contact:** [To be established]

---

*This document is a living framework and will be updated based on stakeholder feedback, regulatory guidance, and pilot learnings.*
