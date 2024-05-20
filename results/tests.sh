## create directories based on arrays
## "{valueFromArr1}_{valueFromArr2}_{valueFromArr3}_{valueFromArr4}"

arr1=('electron' 'proton')
arr2=('all' 'new')
arr3=('optimal' 'raw')
arr4=('(1e0)tiny' '(1e1)small' '(1e2)medium' '(1e3)large' '(1e4)huge' '(1e5)giant')

# create directories
for i in "${arr1[@]}"; do
    for j in "${arr2[@]}"; do
        for k in "${arr3[@]}"; do
            for l in "${arr4[@]}"; do
                mkdir -p "${i}_${j}_${k}_${l}"
            done
        done
    done
done
