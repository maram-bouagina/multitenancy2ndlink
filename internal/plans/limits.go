package plans

type Limits struct {
	MaxStores   int // -1 = unlimited
	MaxProducts int
	MaxStaff    int
}

var planLimits = map[string]Limits{
	"free":       {MaxStores: 1, MaxProducts: 50, MaxStaff: 2},
	"pro":        {MaxStores: 3, MaxProducts: 500, MaxStaff: 10},
	"enterprise": {MaxStores: -1, MaxProducts: -1, MaxStaff: -1},
}

func Get(plan string) Limits {
	l, ok := planLimits[plan]
	if !ok {
		return planLimits["free"]
	}
	return l
}

func (l Limits) CanCreateStore(currentCount int) bool {
	return l.MaxStores == -1 || currentCount < l.MaxStores
}

func (l Limits) CanCreateProduct(currentCount int) bool {
	return l.MaxProducts == -1 || currentCount < l.MaxProducts
}

func (l Limits) CanCreateStaff(currentCount int) bool {
	return l.MaxStaff == -1 || currentCount < l.MaxStaff
}
