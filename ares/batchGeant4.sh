#!/bin/bash
#SBATCH --nodes 1
#SBATCH --ntasks 45
#SBATCH --time=00:59:59
#SBATCH --partition=plgrid-now
#SBATCH -A plgyaptide3-cpu
#SBATCH -C memfs

if [ -z "$RETURN_DIR" ]; then
    echo "Error: RETURN_DIR is not defined"
    exit 1
fi

ml cmake/3.23.1-gcccore-11.3.0
ml expat
ml libxslt

cd $MEMFS

git clone --depth 1 --branch "3.1.55" "https://github.com/emscripten-core/emsdk.git"

$MEMFS/emsdk/emsdk install 3.1.55
$MEMFS/emsdk/emsdk activate 3.1.55
source $MEMFS/emsdk/emsdk_env.sh
wget -O $MEMFS/geant4.10.04.p03.tar.gz https://geant4-data.web.cern.ch/releases/geant4.10.04.p03.tar.gz
tar -xf $MEMFS/geant4.10.04.p03.tar.gz

directory=geant4.10.04.p03
EMSDK_DIR=$MEMFS/emsdk
export GEANT4_INSTALL_DIR=$MEMFS/$directory-install
GEANT4_SOURCE_DIR=$MEMFS/$directory
GEANT4_BUILD_DIR=$MEMFS/$directory-build
GEANT4_SIMULATION_DIR=$MEMFS/$directory-simulation
GEANT4_LIB_SUFFIX=Geant4-10.4.3

function install_geant() {
    local build_type=$1

    install_dir=$GEANT4_INSTALL_DIR-$build_type
    GEANT4_COMPILE_PARAMS="-DCMAKE_INSTALL_PREFIX=$install_dir \
                -DGEANT4_USE_SYSTEM_EXPAT=OFF \
                -DBUILD_STATIC_LIBS=ON \
                -DGEANT4_BUILD_STORE_TRAJECTORY=OFF \
                -DBUILD_SHARED_LIBS=OFF \
                -DGEANT4_INSTALL_DATA=ON $GEANT4_SOURCE_DIR"
    build_dir=$GEANT4_BUILD_DIR-$build_type
    mkdir -p $install_dir $build_dir
    if [ $build_type = "native" ]; then
        cmake -B $build_dir ${GEANT4_COMPILE_PARAMS}
        cmake --build $build_dir --parallel $SLURM_NTASKS
        cmake --install $build_dir --prefix $install_dir
    elif [ $build_type = "emscripten" ]; then
        emcmake cmake -B $build_dir ${GEANT4_COMPILE_PARAMS}
        emmake cmake --build $build_dir --parallel $SLURM_NTASKS
        emmake cmake --install $build_dir --prefix $install_dir
    fi
}

function install_example() {
    local build_type=$1

    simulation_build_dir=$GEANT4_SIMULATION_DIR-build-$build_type
    simulation_install_dir=$GEANT4_SIMULATION_DIR-install-$build_type
    mkdir -p $simulation_build_dir $simulation_install_dir
    Geant4_DIR_ABS=$GEANT4_INSTALL_DIR-$build_type/lib/$GEANT4_LIB_SUFFIX
    if [ $build_type = "native" ]; then
        source $GEANT4_INSTALL_DIR-$build_type/bin/geant4.sh
        cmake -DGeant4_DIR=$Geant4_DIR_ABS -S $GEANT4_SOURCE_DIR -B $simulation_build_dir -DCMAKE_INSTALL_PREFIX=$simulation_install_dir $simulation_directory
        cmake --build $simulation_build_dir --parallel $SLURM_NTASKS
        cmake --install $build_dir --prefix $simulation_install_dir
    elif [ $build_type = "emscripten" ]; then
        source $EMSDK_DIR/emsdk_env.sh
        source $GEANT4_INSTALL_DIR-$build_type/bin/geant4.sh
        emcmake cmake -DGeant4_DIR=$Geant4_DIR_ABS -DCMAKE_INSTALL_PREFIX=$simulation_install_dir -B $simulation_build_dir $simulation_directory
        cd $simulation_build_dir
        emmake make -j
    fi
}

install_geant native

install_geant emscripten

git clone -b real-time-rendering --depth 1 "https://github.com/Derstilon/geant4-wasm-performance"
export simulation_directory=$MEMFS/geant4-wasm-performance/example/B1

install_example native

install_example emscripten

cp -r $simulation_build_dir $RETURN_DIR/wasm
cd ..
