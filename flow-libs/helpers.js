type _$ReturnType<A, B: (...args: any[]) => A> = A;
type $ReturnType<B> = _$ReturnType<*, B>;
