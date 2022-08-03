# hacktheheap
See it live at HacktheHeap.io now! 

## Build Front-end
run `make default`. For an anonymous version (i.e. as used for double-blind review), run `make anon`. 
`make install` further installs the relevant files to the default webserver location (`/var/www/html/`). 

## Back-end
The backend is comprised of a simple webserver written in python, in combination with the probing mechanism 
for real-world heap interactions. 
The backend uses an SQL database (see `backend/heaps/tables.sql`) to save existing solutions, available puzzles 
and so forth. Create a database in your favourite SQL software and add the tables as listed in tables.sql. 
Then, add a user that can update/insert/delete from the table, and add the credentials to `backend/heaps/db_info`.

To run the backend, proxy the `puzzles` subdirectory of the website towards the webserver in `backend/heaps/ptmallocsvc.py`. 
Don't get confused by the name of the file: it runs on all heap managers, not just ptmalloc. 
Build the required heap probing binaries in the same directory (see the Makefile) and run the 
service (e.g. by adding `backend/heaps/hthbackend.service` to systemctl). 

## Paper 
The paper is published in the Workshop On Offensive Technologies (WOOT) 2022, co-located with IEEE Security & Privacy.
The paper itself van be found under `hth-woot.pdf`. 
For citing, please use the following: 
```
@inproceedings{gennissen2022hack,
  title={Hack the Heap: Heap Layout Manipulation made Easy},
  author={Gennissen, Jordy and O’Keeffe, Daniel},
  booktitle={2022 IEEE Security and Privacy Workshops (SPW)},
  year={2022},
  journal={WOOT},
  organization={IEEE}
}
```
