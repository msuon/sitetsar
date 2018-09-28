## Introduction
I as well as a number of people I know have problems with keep track of our time on time sinking sites. 
This extension is built for chrome users to help them keep track and be aware of how much time they spend on each sites.

**Currently under very early stage with limited capabilities.**

## Spotted Bugs
- (mac) CMD + q causes session info to not save

## Missing V1 Features
- Archive data after day ends (12am) (requires rework on the data structure)
- Delete data after 30 days old
- Decent UI
- Rework data structures of storage saved data  
- Gather current data when summary is opened


## TODO:
- Need to track by either title or full url, not just name

## Bugs:
-- Errors while trying to retrieve data from site without title
---- When this error occurs duration count keeps going on for last non errored site
-- Tab updates multiple times when a page first load.
---- We are calling the handlers multiple times before and after the document is ready. Need to only call once when the document is ready


## Important Chrome Execution Points and Bugs Associated with them.
-- Tab change:
---- If domain is same it's not being recorded
-- Window Change
---- Works fine
-- Tab close:
---- Problem stem from tab change
-- Window Close:
-- Works fine unless window doesn't exist in Windows global
-- URL change (Same tab):
---- Clicking link in same domain doesn't record
---- Going to site in the same domain doesn't record
-- When tab is pulled off into a new window 
---- Error occurs (needs further investigation)
