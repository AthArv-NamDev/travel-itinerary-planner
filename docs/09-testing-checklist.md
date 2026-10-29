# 9. Final testing & validation (Milestone 7)

## Automated (backend)
```bash
cd backend && source .venv/bin/activate
pip install -r requirements-dev.txt
pytest -q
```

## Activity 7.1 - Functional testing (tick each on the **deployed** site)

**Auth**
- [ ] Sign up with a new email works (confirm email if enabled)
- [ ] Wrong password shows a readable error
- [ ] Visiting `/app` while signed out redirects to `/login`
- [ ] Sign out works; refreshing keeps you signed in

**Trip generation**
- [ ] Missing destination / budget shows a validation message
- [ ] End date before start date is rejected
- [ ] A trip over 14 days is rejected
- [ ] Valid input produces a trip with the right number of days and opens it
- [ ] Different vibes (e.g. foodie vs adventure) produce visibly different plans

**Itinerary**
- [ ] Day tabs switch days; times are in order with no overlaps
- [ ] Travel time between stops is shown
- [ ] Tick / untick an item; refresh: state persists
- [ ] Add an activity; it appears in time order; cost updates
- [ ] Remove an activity; estimated cost drops
- [ ] Regenerate one day (with and without an instruction)
- [ ] Regenerate the whole trip
- [ ] Rename the title; star / unstar

**Budget**
- [ ] Estimated cost, breakdown and per-person cost are shown
- [ ] A very low budget shows "Over budget"

**Share & export**
- [ ] Create share link; open it in a private window (no login): read-only view
- [ ] Stop sharing; the old link now says invalid
- [ ] Markdown, Calendar (.ics), JSON download; the .ics imports into a calendar
- [ ] Print / PDF looks clean

**Other**
- [ ] Discover returns suggestions and "Plan trip →" pre-fills the builder
- [ ] Preferences save and pre-fill the builder
- [ ] Dashboard search and Favorites filter work
- [ ] Delete a trip removes it from the sidebar and dashboard
- [ ] Layout is usable at phone width (use browser dev-tools device mode)
- [ ] A second account cannot see the first account's trips

## Activity 7.2 - Validate database updates
In Supabase **Table Editor → trips** (or SQL Editor):

```sql
-- latest trips
select id, title, destination, estimated_cost, favorite, share_token, updated_at
from trips order by created_at desc limit 5;

-- itinerary JSON has the expected number of days
select title, jsonb_array_length(itinerary->'days') as days,
       (end_date - start_date + 1) as expected_days
from trips;

-- preferences saved
select * from user_preferences;
```
Check: a new row appears after generating; `favorite`, `title`, `share_token`, `estimated_cost` and `updated_at` change after the matching action in the app; the row disappears after deleting the trip.

Next: [10 - Troubleshooting](10-troubleshooting.md)
