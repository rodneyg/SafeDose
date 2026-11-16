# Synthetic v1 coverage

240 unique procedural scenes. All labels pending Rodney verification.
Illustrative brand text is a proxy, not five real syringe product families. Counts overlap.

| Dimension | Bucket | Development | Locked holdout | Total |
| --- | --- | ---: | ---: | ---: |
| split | development | 192 | 0 | 192 |
| split | holdout | 0 | 48 | 48 |
| brand | B. Braun | 33 | 11 | 44 |
| brand | BD | 33 | 11 | 44 |
| brand | EasyTouch | 39 | 5 | 44 |
| brand | Nipro | 39 | 5 | 44 |
| brand | Terumo | 33 | 11 | 44 |
| brand | unreadable | 15 | 5 | 20 |
| configuration | U-100 / 0.3 mL | 24 | 6 | 30 |
| configuration | U-100 / 0.5 mL | 24 | 6 | 30 |
| configuration | U-100 / 1 mL | 24 | 6 | 30 |
| configuration | U-40 / 0.5 mL | 24 | 6 | 30 |
| configuration | U-40 / 1 mL | 24 | 6 | 30 |
| configuration | mL / 1 mL | 24 | 6 | 30 |
| configuration | mL / 3 mL | 24 | 6 | 30 |
| configuration | mL / 5 mL | 24 | 6 | 30 |
| lighting | backlit | 48 | 12 | 60 |
| lighting | bright | 48 | 12 | 60 |
| lighting | dim | 47 | 13 | 60 |
| lighting | glare | 49 | 11 | 60 |
| angle | 30 | 64 | 16 | 80 |
| angle | 60 | 64 | 16 | 80 |
| angle | straight | 64 | 16 | 80 |
| expected_behavior | read | 120 | 30 | 150 |
| expected_behavior | refuse | 72 | 18 | 90 |
| vial | BPC-157 | 79 | 21 | 100 |
| vial | Testosterone cypionate | 81 | 19 | 100 |
| vial | illegible | 32 | 8 | 40 |

## Configuration by illustrative brand (all scenes)

| Scale / capacity | BD | B. Braun | Terumo | Nipro | EasyTouch |
| --- | ---: | ---: | ---: | ---: | ---: |
| U-100 / 0.3 mL | 6 | 6 | 6 | 6 | 6 |
| U-100 / 0.5 mL | 6 | 6 | 6 | 6 | 6 |
| U-100 / 1 mL | 6 | 6 | 6 | 6 | 6 |
| U-40 / 0.5 mL | 6 | 6 | 6 | 6 | 6 |
| U-40 / 1 mL | 6 | 6 | 6 | 6 | 6 |
| mL / 1 mL | 6 | 6 | 6 | 6 | 6 |
| mL / 3 mL | 6 | 6 | 6 | 6 | 6 |
| mL / 5 mL | 6 | 6 | 6 | 6 | 6 |

Each configuration has 30 scenes (24 development, 6 holdout). Each brand session stays in one split.
40 unreadable scenes (20 blurred, 20 occluded); all 240 scenes include a vial, 200 labels readable.
120 peptide and 120 testosterone scenes, including unreadable labels. Fill: empty, near-empty, middle, near-full, one-third, obscured.
Automated checker agreement: 240/240. This is consistency, not independent human agreement.
No prompt tuning or holdout model calls were performed. Public lock is an audit record, not an access-control boundary.
