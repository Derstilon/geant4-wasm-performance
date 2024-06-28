## create directories based on arrays
## "{valueFromArr1}_{valueFromArr2}_{valueFromArr3}_{valueFromArr4}"

arr1=('electron' 'proton')
arr2=('all' 'new')
arr3=('optimal' 'raw')
arr4=('(1e0)tiny' '(5e0)small' '(1e1)medium' '(5e1)large' '(1e2)huge' '(5e2)giant' '(1e3)enormous')

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

arr1=('electron' 'proton')
arr2=('none')
arr3=('raw')
arr4=('(1e0)tiny' '(5e0)small' '(1e1)medium' '(5e1)large' '(1e2)huge' '(5e2)giant' '(1e3)enormous')

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
