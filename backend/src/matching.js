// Standard donor -> recipient blood group compatibility chart.
// Key: donor's group. Value: recipient groups that donor can safely give to.
const DONATES_TO = {
    'O-':  ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
    'O+':  ['O+', 'A+', 'B+', 'AB+'],
    'A-':  ['A-', 'A+', 'AB-', 'AB+'],
    'A+':  ['A+', 'AB+'],
    'B-':  ['B-', 'B+', 'AB-', 'AB+'],
    'B+':  ['B+', 'AB+'],
    'AB-': ['AB-', 'AB+'],
    'AB+': ['AB+'],
};

function isCompatible(donorGroup, recipientGroup) {
    return DONATES_TO[donorGroup]?.includes(recipientGroup) ?? false;
}

function compatibleDonorGroups(recipientGroup) {
    return Object.keys(DONATES_TO).filter((donorGroup) => isCompatible(donorGroup, recipientGroup));
}

const REST_PERIOD_DAYS = 90;

module.exports = { DONATES_TO, isCompatible, compatibleDonorGroups, REST_PERIOD_DAYS };
