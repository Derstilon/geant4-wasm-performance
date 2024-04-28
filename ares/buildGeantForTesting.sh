#!/bin/bash
# get emscripten
# Get the emsdk repo

function get_emscripten {

    # $1 - url of emscripten git source

    # regex version from the end of the url (x.y.z) or "latest" if not in that format
    local pattern='s/.*\/\([0-9]\+\.[0-9]\+\.[0-9]\+\).*/\1/g'

    local version=$(echo $1 | sed -n "$pattern")
    # if the version is not in the format x.y.z, then set version variable to "latest"
    if [ -z "$version" ]; then
        version="latest"
    fi

    git clone $1

    # Download and install the latest SDK tools.
    # Make the "latest" SDK "active" for the current user. (writes .emscripten file)
    # Activate PATH and other environment variables in the current terminal
    ./emsdk/emsdk install $version
    ./emsdk/emsdk activate $version
    source ./emsdk/emsdk_env.sh

}

function get_geant4() {

    # $1 - url of geant4 tar file

    # regex filename from url
    # 'http://www.foo.com/bar/baz/filename.jpg' should match 'filename.jpg'
    local pattern='s/.*\/\([^\/]*\..*\)$/\1/g'
    local filename=$(echo $1 | sed "$pattern")

    # get directory name after removing .tar.gz
    directory=$(echo $filename | sed 's/\(.*\)\.tar\.gz/\1/g')
    GEANT4_SOURCE_DIR=MEMFS/$directory
    # GEANT4_SOURCE_DIR=$MEMFS/$directory

    # wget $1
    # tar -xf $filename

    echo $directory
}

function build_geant4 {
    # $1 - compile type
    # native or emscripten
    # native is default and uses -native suffix for build directory and cmake compiler
    # emscripten uses -wasm suffix for build directory and emcmake compiler
    local install_dir=$GEANT4_INSTALL_DIR-${1:-native}
    local GEANT4_COMPILE_PARAMS="-DCMAKE_INSTALL_PREFIX=$install_dir \
        -DGEANT4_USE_SYSTEM_EXPAT=OFF \
        -DBUILD_STATIC_LIBS=ON \
        -DGEANT4_BUILD_STORE_TRAJECTORY=OFF \
        -DBUILD_SHARED_LIBS=OFF \
        -DGEANT4_INSTALL_DATA=ON $GEANT4_SOURCE_DIR"
    local build_dir=$GEANT4_BUILD_DIR-${1:-native}

    # rm -rf $install_dir/* $build_dir/*
    mkdir -p $install_dir $build_dir

    if [ $2 = "native" ]; then
        cmake ${GEANT4_COMPILE_PARAMS}

        # run make
        make -j
        make install
    elif [ $2 = "emscripten" ]; then
        emcmake cmake ${GEANT4_COMPILE_PARAMS}

        # run make
        emmake make -j
        emmake make install
    fi
}

function get_simulation() {

    # $1 - url of simulation git source
    # regex repository root name from url
    # https://github.com/Derstilon/geant4-wasm-performance should match "geant4-wasm-performance"
    local pattern='s/.*\/\([^\/]*\)/\1/g'

    local directory=$(echo $1 | sed "$pattern")

    # git clone $1

    echo $directory
}

function build_simulation() {
    # $1 - compile type
    local simulation_build_dir=$GEANT4_SIMULATION_DIR-build-${1:-native}
    local simulation_install_dir=$GEANT4_SIMULATION_DIR-install-${1:-native}

    # rm -rf $simulation_build_dir/* $simulation_install_dir/*
    mkdir -p $simulation_build_dir $simulation_install_dir

    Geant4_DIR_ABS=$GEANT4_INSTALL_DIR-${1:-native}/lib/$GEANT4_LIB_SUFFIX

    if [ ${1:-native} = "native" ]; then

        source $GEANT4_INSTALL_DIR-${1:-native}/bin/geant4.sh
        cmake -DGeant4_DIR=$Geant4_DIR_ABS -S $GEANT4_SOURCE_DIR -B $simulation_build_dir -DCMAKE_INSTALL_PREFIX=$simulation_install_dir
        cmake --build $simulation_build_dir
        cmake --install $simulation_build_dir

    elif [ $1 = "emscripten" ]; then

        source $EMSDK_DIR/emsdk_env.sh
        source $GEANT4_INSTALL_DIR-${1:-emscripten}/bin/geant4.sh
        emcmake cmake -DGeant4_DIR=$Geant4_DIR_ABS -S $GEANT4_SOURCE_DIR -B $simulation_build_dir -DCMAKE_INSTALL_PREFIX=$simulation_install_dir
        emmake cmake --build $simulation_build_dir
        emmake cmake --install $simulation_build_dir
    fi
}

ml cmake/3.23.1-gcccore-11.3.0
ml expat
ml libxslt
ml qt5

# use memory file system
cd $MEMFS

# get emscripten tools
get_emscripten "https://github.com/emscripten-core/emsdk/tree/3.1.55"

# get geant4 source
directory=$(get_geant4 "https://geant4-data.web.cern.ch/releases/geant4.10.04.p03.tar.gz")

# constant variables
EMSDK_DIR=$MEMFS/emsdk
GEANT4_INSTALL_DIR=$MEMFS/$directory-install
GEANT4_SOURCE_DIR=$MEMFS/$directory
GEANT4_BUILD_DIR=$MEMFS/$directory-build
GEANT4_SIMULATION_DIR=$MEMFS/$directory-simulation
GEANT4_LIB_SUFFIX=Geant4-10.4.3

# echo $GEANT4_INSTALL_DIR
# echo $GEANT4_SOURCE_DIR
# echo $GEANT4_BUILD_DIR

build_geant4 native
build_geant4 emscripten

# clone simulation repository
simulation_directory=$(get_simulation "https://geant4-data.web.cern.ch/releases/geant4.10.04.p03.tar.gz")

build_simulation native
build_simulation emscripten

exit 1
