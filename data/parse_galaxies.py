import numpy as np

import astropy.io.fits
import astropy.coordinates
import astropy.cosmology
import astropy.units as u

import json, gzip

files = [
    'BGS_BRIGHT-21.5_NGC_clustering.dat.fits',
    'BGS_BRIGHT-21.5_SGC_clustering.dat.fits',
    'LRG_NGC_clustering.dat.fits',
    'LRG_SGC_clustering.dat.fits',
    'ELG_LOPnotqso_NGC_clustering.dat.fits',
    'ELG_LOPnotqso_SGC_clustering.dat.fits',
    'QSO_NGC_clustering.dat.fits',
    'QSO_SGC_clustering.dat.fits',
]

tracers = [0,0,1,1,2,2,3,3]

xyz = []

for filename, tracer in zip(files, tracers):
    with astropy.io.fits.open(f'data/{filename}') as hdulist:
        data = hdulist[1].data

    coordinates = astropy.coordinates.SkyCoord(
        ra=data['RA']*u.degree,
        dec=data['DEC']*u.degree,
        distance=astropy.cosmology.Planck18.comoving_distance(data['Z'])*u.Mpc,
        frame='icrs'
    ).cartesian

    xyz.append(np.array([
        coordinates.x.value,
        coordinates.y.value,
        coordinates.z.value,
        np.ones(len(data))*tracer,
    ]))

xyz = np.concatenate(xyz, axis=1).T

json_output = json.dumps(np.round(xyz).astype(int).tolist(), separators=(',', ':'))

with gzip.open('galaxies.json.gz', 'wb') as f:
    f.write(json_output.encode())
    
with open('galaxies.json', 'w') as f:
    f.write(json_output)