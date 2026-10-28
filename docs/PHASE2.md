# Phase 2 outcomes: where each deliverable lives

Use this as the skeleton for the report. Items marked **TODO** need real evidence from you.

| Phase 2 deliverable | Evidence in this repository | To add to the report |
| --- | --- | --- |
| Design requirements | Spaces and rules in `README.md` | **TODO** survey results (yes/no questionnaire), stakeholder meeting notes: peak time 10 am to 4 pm, barista's estimate of lost sales, reasons the café would take part |
| Conceptual design: personas, scenarios | none in code | **TODO** personas built from the survey; scenarios: student looking for a seat, barista logging, driver logging parking |
| Conceptual design: user flows and task flows | Screens and routes in `src/screens`, hash routes `#/library/G/A`, `#/parking/E`, `#/cafe` | Flow diagrams: open app, choose section, open map or detailed view, mark or log; barista: sign in, tap chairs |
| Information architecture | Home, then Library (floor dropdown, section, room), Café, Parking (zone), Staff | Sitemap figure |
| Wireframes | Sketches (parking, library ground and 1st floor) and the running screens | Sketch photos next to screenshots |
| HCI principles and justification | Table in `README.md` | One paragraph per principle with a screenshot |
| Interactive prototype for task-based evaluation | The app, in demo mode or live | Link to the deployed site and this repository |
| Iterative refinement | `git log`; iteration notes below | Before and after screenshots per iteration |

## Iterations so far

1. **Occupancy report (library).** Students report the floor as quiet or busy. Dropped by the team: only marking individual ILS stays.
2. **Student marks.** A student marks the ILS they sit at; unmarked desks stay grey.
3. **Green state and expiry.** A student leaving, or someone seeing an empty desk, marks it free (green for an hour). Taken marks expire after 2 hours so a forgotten mark cannot stay red.
4. **Parking logging.** Zone view with large targets; start and end time; end time editable; spaces released 10 minutes after the end time.

## Task-based evaluation script (Phase 3 preview)

Suggested tasks: (1) find out whether the café has a free chair, (2) find a free ILS on the 1st floor and mark it, (3) see whether collab room 1 is open at 2:30 pm, (4) log a parking space until 3 pm, then change it to 4 pm and leave, (5) ask to be told when Zone E has space.
