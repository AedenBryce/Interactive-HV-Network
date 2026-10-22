# Initial drawing review queue

These are open source questions and review tasks, not confirmed descriptions of the installed network. The queue will grow as the rest of the drawings are reviewed. No user decisions have been recorded against these entries.

Source references S1-S7 are linked, with revisions and pages, in [the review register](README.md#visual-review-performed).

## R001 - SW411 incomer source and commissioning status

**Status: Unconfirmed.** S3 (11098-07110-EL-DR-5151, rev 7, page 1, upper source diagram) shows future 220 kV / 22 kV arrangements above incomers 01 and 02, while power-station connections are above incomers 03 and 04. S4 (11098-07110-EL-DR-2350, rev 16, page 1, upper diagram) also labels two overhead-line arrivals as future. S1/S2 (rev 0, page 1, upper SW411 diagrams) show arrivals referenced to the power station, including TF-11 and TF12 labels.

**Inference:** These depictions need reconciliation before assigning the current sources and availability of each incomer. They do not establish which of the shown future arrangements was commissioned.

**Review needed:** Confirm the actual source path for each of the four incomers and identify which arrangements remain future or are no longer applicable. Do not select drawing precedence solely from revision dates.

## R002 - RM721 feeder device identifiers at SW411

**Status: Unconfirmed canonical identity.** S3 (rev 7, page 1, tier 16 / RM721 feeder) prints `CB SW454 FD 01` and `ES SW454 FD 01` within the RM721 feeder bay. S2 (rev 0, page 1, SW411 tier 16) prints `CB RM721 FD01` and `ES RM721 FD01`.

**Inference:** The same bay appears to have inconsistent breaker and earth-switch labels across the drawings. A drawing error is not yet established.

**Review needed:** Confirm the correct physical asset identifiers. Retain the conflicting drawing labels in the source record instead of silently overwriting them.

## R003 - Station / switchyard earthing interlock conditions

**Status: Unconfirmed.** S3 (rev 7, page 1, note 3) says: "MECHANICAL INTERLOCK OF EARTHING TO BE PROVIDED TO SWITCHYARD AND POWER STATION".

The source does not confirm the installed interlock conditions, affected device combinations, key identities or switching sequence. This note alone does not expressly authorise a switching action. Affected controls cannot be finalised from this note alone.

**Review needed:** Locate applicable interlock details in the remaining supplied drawings, or obtain the owner's confirmation of the missing conditions. Affected controls remain disabled while their interlock is unresolved, in accordance with the confirmed project requirement.

## R004 - Off-page external connections and supplied coverage

**Status: Unconfirmed extent and operating status.** The initial inspected sources reference the following drawings, whose identifiers are not present among the supplied filenames:

- S5 (rev 3, page 1, SB02 F6): `CBSS-ES-SLD-70-80-0001`, connection labelled "TO ALINTA".
- S5 (rev 3, page 1, SB01 F3): `07110-EL-DR-6160`, labelled "CLOUDBREAK VILLAGE O/H LINE". Other supplied camp or mine drawings may cover part of this connection; reconciliation is pending.
- S6 (rev 0, page 1, Norfolk / Bigge off-page references): `CB22OP050B-10018-DR-EL-0032`.

The absence of an exact filename does not establish that the connection is undocumented elsewhere. The sources do not confirm the full topology or availability beyond these off-page points.

**Review needed:** Cross-check all remaining source sheets for equivalent coverage. Retain any unsupported extension as an unconfirmed boundary connection and resolve the required extent with the owner after review.

## R005 - Normal starting configuration

**Status: Unconfirmed; acceptance task.** No device lineup or source-availability configuration has been accepted by the owner. Drawn symbol positions have not been accepted as the current normal configuration.

**Review needed:** Prepare the starting-state list after the connectivity and interlock review, then obtain the owner's confirmation against the complete model version.
